package com.cursos.aula.tareas;
import com.cursos.aula.*;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.AuthPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import java.sql.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfSystemProperty(named="aula.postgres.test",matches="true")
class TareaPostgresTest {
    static final String URL="jdbc:postgresql://127.0.0.1:55439/tareas_validation";
    @Test void migracionJpaCrudRestriccionesYConcurrencia() throws Exception {
        try(Connection db=DriverManager.getConnection(URL,"aula_test","")){
            assertThat(value(db,"SHOW cluster_name")).isEqualTo("aula-isolated-validation");
            assertThat(value(db,"SELECT current_database()")).isEqualTo("tareas_validation");
            assertThat(value(db,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).isEqualTo("0");
            UUID user=UUID.randomUUID(), curso=UUID.randomUUID(), modulo=UUID.randomUUID();
            sql(db,"CREATE TABLE public.usuarios(id UUID PRIMARY KEY); CREATE TABLE public.cursos(id UUID PRIMARY KEY); CREATE TABLE public.pedidos(id UUID PRIMARY KEY)");
            sql(db,"INSERT INTO public.usuarios VALUES ('"+user+"'); INSERT INTO public.cursos VALUES ('"+curso+"'); INSERT INTO public.pedidos VALUES ('"+UUID.randomUUID()+"')");
            migration(db,"migracion_aula_virtual_fase_a.sql");
            sql(db,"INSERT INTO public.curso_modulos VALUES ('"+modulo+"','"+curso+"','Modulo',1)");
            String before=snapshot(db);
            migration(db,"migracion_aula_virtual_e2.sql");
            assertThat(snapshot(db)).isEqualTo(before);
            assertThat(value(db,"SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename IN ('aula_tareas','aula_entregas','aula_entrega_archivos')")).isEqualTo("8");
            assertThat(value(db,"SELECT count(*) FROM pg_constraint WHERE conrelid IN ('aula_tareas'::regclass,'aula_entregas'::regclass,'aula_entrega_archivos'::regclass) AND contype='f' AND confdeltype='r'")).isEqualTo("6");
            assertThat(value(db,"SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('aula_tareas'::regclass,'aula_entregas'::regclass,'aula_entrega_archivos'::regclass)")).isEqualTo("t");
            // Fase 2: los escritores academicos coordinan por curso (curso_revision_academica).
            migration(db,"migracion_certificaciones_fase_2.sql");
            var factory=new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(new DriverManagerDataSource(URL,"aula_test",""));
            factory.setPackagesToScan("com.cursos.aula.tareas");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate"));
            factory.afterPropertiesSet();
            try {
                var emf=Objects.requireNonNull(factory.getObject());
                var em=SharedEntityManagerCreator.createSharedEntityManager(emf);
                var repositories=new JpaRepositoryFactory(em);
                var tareas=repositories.getRepository(TareaRepository.class);
                var entregas=repositories.getRepository(EntregaRepository.class);
                var cursos=TareaHttpTest.repo(CursoRepository.class);
                var modulos=TareaHttpTest.repo(ModuloRepository.class);
                Curso cursoEntity=new Curso(); cursoEntity.setDocenteId(user);
                when(cursos.findById(curso)).thenReturn(Optional.of(cursoEntity));
                when(modulos.findByIdAndCursoId(modulo,curso)).thenReturn(Optional.of(new Modulo(curso,"Modulo",1)));
                AulaService aula=new AulaService(cursos,modulos,TareaHttpTest.repo(MaterialRepository.class),null,null);
                var proxy=new ProxyFactory(new TareaService(aula,tareas,entregas));
                proxy.addAdvice(new TransactionInterceptor(new JpaTransactionManager(emf),new AnnotationTransactionAttributeSource()));
                TareaService service=(TareaService)proxy.getProxy();
                AuthPrincipal principal=new AuthPrincipal(user.toString(),"DOCENTE");
                Instant fecha=Instant.parse("2030-01-01T15:00:00Z");
                var created=service.crear(curso,modulo,new TareaController.Crear("Tarea","Consigna",fecha,Tarea.TipoEntrega.AMBOS),principal);
                UUID id=created.id();
                assertThat(service.listar(curso,modulo,principal)).hasSize(1);
                assertThat(service.detalle(curso,modulo,id,principal).fechaLimite()).isEqualTo(fecha);
                var updated=service.editar(curso,modulo,id,new TareaController.Editar("Editada","Consigna",fecha,Tarea.TipoEntrega.TEXTO,created.version()),principal);
                assertThat(updated.version()).isEqualTo(created.version()+1);
                // Escritor real: bloqueo de curso + triggers -> crear (1) y editar (2).
                assertThat(value(db,"SELECT revision FROM public.curso_revision_academica WHERE curso_id='"+curso+"'")).isEqualTo("2");
                assertThatThrownBy(()->service.eliminar(curso,modulo,id,created.version(),principal))
                    .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
                // Two persistence contexts reproduce an optimistic locking collision.
                try(var first=emf.createEntityManager();var second=emf.createEntityManager()){
                    first.getTransaction().begin(); second.getTransaction().begin();
                    Tarea a=first.find(Tarea.class,id),b=second.find(Tarea.class,id);
                    a.editar("Version A","Consigna",fecha,Tarea.TipoEntrega.AMBOS);
                    first.getTransaction().commit();
                    b.editar("Version B","Consigna",fecha,Tarea.TipoEntrega.ARCHIVO);
                    assertThatThrownBy(()->second.getTransaction().commit()).isInstanceOf(jakarta.persistence.RollbackException.class);
                }
                long version=service.detalle(curso,modulo,id,principal).version();
                UUID entregaId,archivoId;
                try(var write=emf.createEntityManager()){
                    write.getTransaction().begin();
                    Entrega entrega=new Entrega();
                    ReflectionTestUtils.setField(entrega,"tareaId",id);
                    ReflectionTestUtils.setField(entrega,"estudianteId",user);
                    write.persist(entrega);write.flush();entregaId=entrega.getId();
                    EntregaArchivo archivo=new EntregaArchivo();
                    ReflectionTestUtils.setField(archivo,"entregaId",entregaId);
                    ReflectionTestUtils.setField(archivo,"objectKey","TEST_ONLY/archivo.pdf");
                    ReflectionTestUtils.setField(archivo,"nombreOriginal","archivo.pdf");
                    ReflectionTestUtils.setField(archivo,"mimeType","application/pdf");
                    ReflectionTestUtils.setField(archivo,"tamanoBytes",10485760L);
                    ReflectionTestUtils.setField(archivo,"tipo",Material.Tipo.PDF);
                    write.persist(archivo);write.getTransaction().commit();archivoId=archivo.getId();
                }
                assertThat(repositories.getRepository(EntregaArchivoRepository.class).findById(archivoId)).isPresent();
                assertThat(entregas.existsByTareaId(id)).isTrue();
                assertThatThrownBy(()->service.editar(curso,modulo,id,new TareaController.Editar("No","No",fecha,Tarea.TipoEntrega.TEXTO,version),principal))
                    .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
                assertThatThrownBy(()->service.eliminar(curso,modulo,id,version,principal))
                    .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
                reject(db,"DELETE FROM aula_tareas WHERE id='"+id+"'","23001");
                reject(db,"INSERT INTO aula_entregas(id,tarea_id,estudiante_id) VALUES(gen_random_uuid(),'"+id+"','"+user+"')","23505");
                reject(db,"UPDATE aula_entregas SET tarea_id='"+UUID.randomUUID()+"'","23503");
                reject(db,"UPDATE aula_tareas SET version=-1","23514");
                reject(db,"UPDATE aula_tareas SET fecha_limite=NULL","23502");
                reject(db,"UPDATE aula_tareas SET tipo_entrega='OTRO'","23514");
                reject(db,"UPDATE aula_tareas SET consigna=' '","23514");
                reject(db,"UPDATE aula_entregas SET estado='CALIFICADA'","23514");
                String grade="UPDATE aula_entregas SET estado='CALIFICADA',entregada_en=CURRENT_TIMESTAMP,nota=%s,retroalimentacion='Bien',calificado_por='"+user+"',calificada_en=CURRENT_TIMESTAMP";
                reject(db,String.format(grade,"20.01"),"23514");
                reject(db,String.format(grade,"-0.01"),"23514");
                sql(db,String.format(grade,"0"));sql(db,String.format(grade,"20"));
                reject(db,"UPDATE aula_entregas SET retroalimentacion=' '","23514");
                for(String change:List.of("tamano_bytes=0","tamano_bytes=10485761","mime_type='text/html'","version=-1")){
                    reject(db,"UPDATE aula_entrega_archivos SET "+change,"23514");
                }
                reject(db,"INSERT INTO aula_entrega_archivos SELECT gen_random_uuid(),entrega_id,object_key||'2',nombre_original,mime_type,tamano_bytes,tipo,estado,created_at,version FROM aula_entrega_archivos","23505");
                // Only delete synthetic dependent rows to exercise successful task deletion.
                sql(db,"DELETE FROM aula_entrega_archivos; DELETE FROM aula_entregas");
                service.eliminar(curso,modulo,id,version,principal);
                assertThat(service.listar(curso,modulo,principal)).isEmpty();
            } finally {factory.destroy();}
            assertThat(snapshot(db)).isEqualTo(before);
            sql(db,"CREATE ROLE tareas_reader NOLOGIN; GRANT USAGE ON SCHEMA public TO tareas_reader; GRANT SELECT ON aula_tareas,aula_entregas,aula_entrega_archivos TO tareas_reader");
            sql(db,"INSERT INTO aula_tareas(id,modulo_id,titulo,consigna,fecha_limite,tipo_entrega,creado_por) VALUES(gen_random_uuid(),'"+modulo+"','RLS','RLS',CURRENT_TIMESTAMP,'TEXTO','"+user+"')");
            sql(db,"SET ROLE tareas_reader");
            assertThat(value(db,"SELECT count(*) FROM aula_tareas")).isEqualTo("0");
            sql(db,"RESET ROLE");
            System.out.println("E2 PostgreSQL: migration, Hibernate validate (3 entities), real transactional CRUD, versions, FK/CHECK/UNIQUE and RLS OK");
        }
    }
    static void migration(Connection db,String name)throws Exception{
        Path p=Path.of("../database",name);if(!Files.exists(p))p=Path.of("database",name);sql(db,Files.readString(p));
    }
    static String snapshot(Connection db)throws Exception{
        StringBuilder b=new StringBuilder();
        for(String t:List.of("usuarios","cursos","pedidos","curso_modulos","curso_materiales")){
            b.append(value(db,"SELECT coalesce(json_agg(t ORDER BY id)::text,'[]') FROM "+t+" t"));
            b.append(value(db,"SELECT string_agg(column_name||':'||data_type||':'||is_nullable,',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='"+t+"'"));
        }
        return b.toString();
    }
    static void reject(Connection db,String sql,String state){
        assertThatThrownBy(()->sql(db,sql)).isInstanceOf(SQLException.class).satisfies(e->assertThat(((SQLException)e).getSQLState()).isEqualTo(state));
    }
    static void sql(Connection db,String sql)throws SQLException{try(var s=db.createStatement()){s.execute(sql);}}
    static String value(Connection db,String sql)throws SQLException{try(var s=db.createStatement();var r=s.executeQuery(sql)){r.next();return r.getString(1);}}
}
