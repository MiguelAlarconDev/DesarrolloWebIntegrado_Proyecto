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
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfSystemProperty(named="aula.postgres.test",matches="true")
class RevisionPostgresTest {
    @Test void paginacionCalificacionInmediataYConcurrencia()throws Exception{
        String url="jdbc:postgresql://127.0.0.1:55439/revision_validation";
        try(Connection db=DriverManager.getConnection(url,"aula_test","")){
            assertThat(TareaPostgresTest.value(db,"SHOW cluster_name")).isEqualTo("aula-isolated-validation");
            assertThat(TareaPostgresTest.value(db,"SELECT current_database()")).isEqualTo("revision_validation");
            assertThat(TareaPostgresTest.value(db,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).isEqualTo("0");
            UUID docente=UUID.randomUUID(),curso=UUID.randomUUID(),modulo=UUID.randomUUID();
            List<UUID> alumnos=List.of(UUID.randomUUID(),UUID.randomUUID(),UUID.randomUUID());
            TareaPostgresTest.sql(db,"CREATE TABLE usuarios(id uuid PRIMARY KEY); CREATE TABLE cursos(id uuid PRIMARY KEY)");
            for(UUID id:List.of(docente,alumnos.get(0),alumnos.get(1),alumnos.get(2)))
                TareaPostgresTest.sql(db,"INSERT INTO usuarios VALUES('"+id+"')");
            TareaPostgresTest.sql(db,"INSERT INTO cursos VALUES('"+curso+"')");
            TareaPostgresTest.migration(db,"migracion_aula_virtual_fase_a.sql");
            TareaPostgresTest.migration(db,"migracion_aula_virtual_e2.sql");
            TareaPostgresTest.migration(db,"migracion_certificaciones_fase_2.sql");
            TareaPostgresTest.sql(db,"INSERT INTO curso_modulos VALUES('"+modulo+"','"+curso+"','M',1)");
            var factory=new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(new DriverManagerDataSource(url,"aula_test",""));
            factory.setPackagesToScan("com.cursos.aula.tareas");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate"));
            factory.afterPropertiesSet();
            try{
                var emf=Objects.requireNonNull(factory.getObject());
                var repos=new JpaRepositoryFactory(SharedEntityManagerCreator.createSharedEntityManager(emf));
                var cursos=TareaHttpTest.repo(CursoRepository.class);
                var modulos=TareaHttpTest.repo(ModuloRepository.class);
                var matriculas=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
                Curso c=new Curso();c.setDocenteId(docente);
                when(cursos.findById(curso)).thenReturn(Optional.of(c));
                when(modulos.findByIdAndCursoId(modulo,curso)).thenReturn(Optional.of(new Modulo(curso,"M",1)));
                when(matriculas.habilitada(eq(curso),any())).thenReturn(true);
                var storage=new EntregaPostgresTest.FakeStorage();
                var aula=new AulaService(cursos,modulos,TareaHttpTest.repo(MaterialRepository.class),matriculas,storage);
                var clock=Clock.fixed(Instant.parse("2030-01-01T12:00:00Z"),ZoneOffset.UTC);
                var service=new EntregaService(aula,repos.getRepository(TareaRepository.class),repos.getRepository(EntregaRepository.class),
                    repos.getRepository(EntregaArchivoRepository.class),storage,new JpaTransactionManager(emf),clock);
                UUID tarea;
                try(var em=emf.createEntityManager()){
                    em.getTransaction().begin();
                    Tarea t=new Tarea(modulo,"T","C",clock.instant().plusSeconds(60),Tarea.TipoEntrega.AMBOS,docente);
                    em.persist(t);em.getTransaction().commit();tarea=t.getId();
                }
                AuthPrincipal profesor=new AuthPrincipal(docente.toString(),"DOCENTE");
                AuthPrincipal alumno=new AuthPrincipal(alumnos.get(0).toString(),"ESTUDIANTE");
                var file=new EntregaService.Adjunto("test.pdf","application/pdf","%PDF-1.7 test".getBytes());
                var primera=service.entregar(curso,modulo,tarea,-1,"Respuesta",file,alumno);
                service.entregar(curso,modulo,tarea,-1,"Otra",null,new AuthPrincipal(alumnos.get(1).toString(),"ESTUDIANTE"));
                // An incomplete row is not published in the teacher's paginated list.
                TareaPostgresTest.sql(db,"INSERT INTO aula_entregas(id,tarea_id,estudiante_id) VALUES(gen_random_uuid(),'"+tarea+"','"+alumnos.get(2)+"')");
                var p0=service.listarDocente(curso,modulo,tarea,0,1,profesor);
                var p1=service.listarDocente(curso,modulo,tarea,1,1,profesor);
                assertThat(p0.totalElements()).isEqualTo(2);
                assertThat(p0.totalPages()).isEqualTo(2);
                assertThat(p0.items().get(0).entrega().id()).isNotEqualTo(p1.items().get(0).entrega().id());
                assertThat(service.listarDocente(curso,modulo,tarea,2,1,profesor).items()).isEmpty();
                assertThat(service.descargarDocente(curso,modulo,tarea,primera.id(),profesor).url()).isEqualTo("https://storage.invalid/signed");

                var cero=service.calificar(curso,modulo,tarea,primera.id(),BigDecimal.ZERO," Revisado ",primera.version(),profesor);
                assertThat(cero.nota()).isEqualByComparingTo("0");
                assertThat(service.propia(curso,modulo,tarea,alumno).retroalimentacion()).isEqualTo("Revisado");
                assertThat(cero.estado()).isEqualTo(Entrega.Estado.CALIFICADA);
                var veinte=service.calificar(curso,modulo,tarea,primera.id(),new BigDecimal("20"),"Excelente",cero.version(),profesor);
                assertThat(veinte.nota()).isEqualByComparingTo("20");
                var decimal=service.calificar(curso,modulo,tarea,primera.id(),new BigDecimal("12.34"),"Revision",veinte.version(),profesor);
                assertThat(service.propia(curso,modulo,tarea,alumno).nota()).isEqualByComparingTo("12.34");
                // Same grade, feedback and timestamp must still consume the version.
                var igual=service.calificar(curso,modulo,tarea,primera.id(),new BigDecimal("12.34"),"Revision",decimal.version(),profesor);
                assertThat(igual.version()).isGreaterThan(decimal.version());
                assertThatThrownBy(()->service.calificar(curso,modulo,tarea,primera.id(),BigDecimal.TEN,"Obsoleta",decimal.version(),profesor))
                    .isInstanceOf(ResponseStatusException.class);

                CyclicBarrier start=new CyclicBarrier(2);
                ExecutorService pool=Executors.newFixedThreadPool(2);
                try{
                    Callable<Integer> grade=()->{
                        start.await(5,TimeUnit.SECONDS);
                        try{service.calificar(curso,modulo,tarea,primera.id(),new BigDecimal("15"),"Concurrente",igual.version(),profesor);return 200;}
                        catch(ResponseStatusException ex){return ex.getStatusCode().value();}
                    };
                    Future<Integer> a=pool.submit(grade),b=pool.submit(grade);
                    assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
                }finally{pool.shutdownNow();}
                // A replacement and grade racing on a still ungraded submission cannot both win.
                var alumno2=new AuthPrincipal(alumnos.get(1).toString(),"ESTUDIANTE");
                var segunda=service.propia(curso,modulo,tarea,alumno2);
                CyclicBarrier race=new CyclicBarrier(2);
                ExecutorService workers=Executors.newFixedThreadPool(2);
                try{
                    Future<Integer> a=workers.submit(()->{
                        race.await(5,TimeUnit.SECONDS);
                        try{service.calificar(curso,modulo,tarea,segunda.id(),BigDecimal.TEN,"Nota",segunda.version(),profesor);return 200;}
                        catch(ResponseStatusException ex){return ex.getStatusCode().value();}
                    });
                    Future<Integer> b=workers.submit(()->{
                        race.await(5,TimeUnit.SECONDS);
                        try{service.entregar(curso,modulo,tarea,segunda.version(),"Reemplazo",null,alumno2);return 200;}
                        catch(ResponseStatusException ex){return ex.getStatusCode().value();}
                    });
                    assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
                }finally{workers.shutdownNow();}
                System.out.println("E4 PostgreSQL: pagination, immediate grades, regrading, same-value versions, concurrent grading and replacement race OK");
            }finally{factory.destroy();}
        }
    }
}
