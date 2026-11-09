package com.cursos.certificaciones;

import com.cursos.aula.tareas.Entrega;
import com.cursos.aula.tareas.TareaRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

/** Opt-in only: dedicated loopback cluster, never application datasource configuration. */
@EnabledIfSystemProperty(named="certificaciones.postgres.test", matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class RecomendacionPostgresTest {
    private static final String URL="jdbc:postgresql://127.0.0.1:55441/certificaciones_validation";
    private LocalContainerEntityManagerFactoryBean factory;
    private TareaRepository tareas;
    private final UUID docente=UUID.randomUUID(), alumno=UUID.randomUUID(), otroAlumno=UUID.randomUUID();

    private Connection connect() throws SQLException {
        Connection c=DriverManager.getConnection(URL,"certificaciones_test","");
        try {
            assertThat(value(c,"SHOW cluster_name")).isEqualTo("certificaciones-isolated-validation");
            assertThat(value(c,"SELECT current_database()")).isEqualTo("certificaciones_validation");
            assertThat(value(c,"SELECT host(inet_server_addr())")).isEqualTo("127.0.0.1");
            return c;
        } catch(Throwable ex) {c.close();throw ex;}
    }
    @BeforeAll void preparar() throws Exception {
        try(Connection c=connect()) {
            assertThat(value(c,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).isEqualTo("0");
            sql(c,"CREATE TABLE public.usuarios(id UUID PRIMARY KEY); CREATE TABLE public.cursos(id UUID PRIMARY KEY)");
            for(UUID id:List.of(docente,alumno,otroAlumno)) sql(c,"INSERT INTO usuarios VALUES ('"+id+"')");
            for(String file:List.of("migracion_aula_virtual_fase_a.sql","migracion_aula_virtual_e2.sql")) {
                Path path=Path.of("../database",file);
                if(!Files.exists(path)) path=Path.of("database",file);
                sql(c,Files.readString(path));
            }
        }
        factory=new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(new DriverManagerDataSource(URL,"certificaciones_test",""));
        factory.setPackagesToScan("com.cursos.aula.tareas");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate"));
        factory.afterPropertiesSet();
        tareas=new JpaRepositoryFactory(SharedEntityManagerCreator.createSharedEntityManager(
                Objects.requireNonNull(factory.getObject()))).getRepository(TareaRepository.class);
    }
    @AfterAll void cerrar() {if(factory!=null) factory.destroy();}

    @Test void separaCursosModulosYEstudiantesConProyeccionReal() throws Exception {
        try(Connection c=connect()) {
            UUID curso=curso(c), ajeno=curso(c);
            UUID t1=tarea(c,modulo(c,curso)), t2=tarea(c,modulo(c,curso)), t3=tarea(c,modulo(c,ajeno));
            entrega(c,t1,alumno,"CALIFICADA", "12.50");
            entrega(c,t2,alumno,"CALIFICADA", "15.50");
            entrega(c,t3,alumno,"CALIFICADA", "0.00");
            entrega(c,t1,otroAlumno,"CALIFICADA", "1.00");
            entrega(c,t2,otroAlumno,"CALIFICADA", "3.00");
            var rows=tareas.evaluaciones(curso,alumno);
            assertThat(rows).extracting(TareaRepository.EvaluacionAcademica::getTareaId).containsExactlyInAnyOrder(t1,t2);
            assertThat(rows).allSatisfy(r->{assertThat(r.getEstado()).isEqualTo(Entrega.Estado.CALIFICADA);assertThat(r.getConfirmada()).isTrue();});
            assertThat(MotorRecomendacion.calcular(curso,alumno,rows).promedio()).isEqualByComparingTo("14.00");
            assertThat(resultado(curso,otroAlumno).promedio()).isEqualByComparingTo("2.00");
            assertThat(resultado(ajeno,alumno).promedio()).isEqualByComparingTo("0.00");
        }
    }
    @Test void pendientesAusentesYSinActividadNoSeConviertenEnCero() throws Exception {
        try(Connection c=connect()) {
            UUID curso=curso(c), modulo=modulo(c,curso);
            UUID ausente=tarea(c,modulo), pendiente=tarea(c,modulo), entregada=tarea(c,modulo), calificada=tarea(c,modulo);
            entrega(c,pendiente,alumno,"ENVIO_PENDIENTE",null);
            entrega(c,entregada,alumno,"ENTREGADA",null);
            entrega(c,calificada,alumno,"CALIFICADA","20.00");
            var rows=tareas.evaluaciones(curso,alumno);
            assertThat(rows).hasSize(4);
            var sinEntrega=rows.stream().filter(r->r.getTareaId().equals(ausente)).findFirst().orElseThrow();
            assertThat(sinEntrega.getEstado()).isNull();assertThat(sinEntrega.getConfirmada()).isFalse();
            var r=resultado(curso,alumno);
            assertThat(r.tareasCalificadas()).isEqualTo(1);assertThat(r.tareasPendientes()).isEqualTo(3);
            assertThat(r.promedio()).isNull();assertThat(r.recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.SIN_DATOS_SUFICIENTES);
            assertThat(resultado(curso,otroAlumno).tareasPendientes()).isEqualTo(4);
            assertThat(resultado(curso(c),alumno).totalTareas()).isZero();
        }
    }
    @Test void recalificacionConcurrenteSinLecturasSuciasNiCache() throws Exception {
        UUID curso;
        UUID e1,e2;
        try(Connection c=connect()) {
            curso=curso(c);UUID modulo=modulo(c,curso);
            e1=entrega(c,tarea(c,modulo),alumno,"CALIFICADA","10.00");
            e2=entrega(c,tarea(c,modulo),alumno,"CALIFICADA","10.00");
        }
        var escrita=new CountDownLatch(1);var confirmar=new CountDownLatch(1);
        var pool=Executors.newSingleThreadExecutor();
        try {
            var writer=pool.submit(()->{
                try(Connection c=connect()) {
                    c.setAutoCommit(false);
                    try {
                        assertThat(sql(c,"UPDATE aula_entregas SET nota=16.00,version=version+1,calificada_en=CURRENT_TIMESTAMP WHERE id IN ('"+e1+"','"+e2+"') AND version=0")).isEqualTo(2);
                        escrita.countDown();
                        if(!confirmar.await(15,TimeUnit.SECONDS)) throw new IllegalStateException("Timeout de coordinacion");
                        c.commit();
                    } catch(Exception ex) {c.rollback();throw ex;}
                }
                return null;
            });
            assertThat(escrita.await(15,TimeUnit.SECONDS)).isTrue();
            for(int i=0;i<5;i++) {
                var before=resultado(curso,alumno);
                assertThat(before.promedio()).isEqualByComparingTo("10.00");
                assertThat(before.recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.NO_APTO);
            }
            confirmar.countDown();writer.get(15,TimeUnit.SECONDS);
            var after=resultado(curso,alumno);
            assertThat(after.promedio()).isEqualByComparingTo("16.00");
            assertThat(after.recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.APTO);
            try(Connection c=connect()) {
                assertThat(sql(c,"UPDATE aula_entregas SET nota=0,version=version+1 WHERE id='"+e1+"' AND version=0")).isZero();
            }
        } finally {confirmar.countDown();pool.shutdownNow();assertThat(pool.awaitTermination(20,TimeUnit.SECONDS)).isTrue();}
    }
    private MotorRecomendacion.Resultado resultado(UUID curso,UUID estudiante) {
        return MotorRecomendacion.calcular(curso,estudiante,tareas.evaluaciones(curso,estudiante));
    }
    private UUID curso(Connection c)throws SQLException {UUID id=UUID.randomUUID();sql(c,"INSERT INTO cursos VALUES ('"+id+"')");return id;}
    private UUID modulo(Connection c,UUID curso)throws SQLException {
        UUID id=UUID.randomUUID();sql(c,"INSERT INTO curso_modulos VALUES ('"+id+"','"+curso+"','TEST',1)");return id;
    }
    private UUID tarea(Connection c,UUID modulo)throws SQLException {
        UUID id=UUID.randomUUID();sql(c,"INSERT INTO aula_tareas(id,modulo_id,titulo,consigna,fecha_limite,tipo_entrega,creado_por) VALUES ('"+id+"','"+modulo+"','TEST','TEST',CURRENT_TIMESTAMP,'TEXTO','"+docente+"')");return id;
    }
    private UUID entrega(Connection c,UUID tarea,UUID estudiante,String estado,String nota)throws SQLException {
        UUID id=UUID.randomUUID();
        boolean calificada=estado.equals("CALIFICADA");
        sql(c,"INSERT INTO aula_entregas(id,tarea_id,estudiante_id,estado,entregada_en,nota,retroalimentacion,calificado_por,calificada_en) VALUES ('"
            +id+"','"+tarea+"','"+estudiante+"','"+estado+"',"+(estado.equals("ENVIO_PENDIENTE")?"NULL":"CURRENT_TIMESTAMP")+","+nota+","
            +(calificada?"'TEST','"+docente+"',CURRENT_TIMESTAMP":"NULL,NULL,NULL")+")");
        return id;
    }
    private static int sql(Connection c,String sql)throws SQLException {try(var s=c.createStatement()){s.execute(sql);return s.getUpdateCount();}}
    private static String value(Connection c,String sql)throws SQLException {try(var s=c.createStatement();var r=s.executeQuery(sql)){r.next();return r.getString(1);}}
}
