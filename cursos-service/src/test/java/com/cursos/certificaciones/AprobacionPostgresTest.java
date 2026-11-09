package com.cursos.certificaciones;

import com.cursos.aula.*;
import com.cursos.aula.tareas.TareaRepository;
import com.cursos.entity.Curso;
import com.cursos.repository.CursoRepository;
import com.cursos.security.AuthPrincipal;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.web.server.ResponseStatusException;
import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfSystemProperty(named="aprobaciones.postgres.test",matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AprobacionPostgresTest {
    static final String URL="jdbc:postgresql://127.0.0.1:55442/aprobaciones_validation";
    LocalContainerEntityManagerFactoryBean factory;
    JdbcTemplate jdbc;EntityManager em;JpaTransactionManager manager;
    AprobacionRepository aprobaciones;RevisionAcademicaRepository historial;TareaRepository tareas;
    final UUID docente=UUID.randomUUID(),alumno=UUID.randomUUID();
    final AuthPrincipal actor=new AuthPrincipal(docente.toString(),"DOCENTE");
    MatriculaClient matriculas;AulaService aula;AprobacionService service;EvidenciaAcademica evidencia;
    record Fixture(UUID curso,UUID modulo,UUID tarea,UUID entrega) {}
    Connection connect()throws SQLException {return DriverManager.getConnection(URL,"aprobaciones_test","");}
    @BeforeAll void preparar()throws Exception {
        try(Connection c=connect()) {
            assertThat(value(c,"SHOW cluster_name")).isEqualTo("aprobaciones-isolated-validation");
            assertThat(value(c,"SELECT current_database()")).isEqualTo("aprobaciones_validation");
            assertThat(value(c,"SELECT host(inet_server_addr())")).isEqualTo("127.0.0.1");
            assertThat(value(c,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).isEqualTo("0");
            sql(c,"CREATE TABLE public.usuarios(id UUID PRIMARY KEY);CREATE TABLE public.cursos(id UUID PRIMARY KEY,docente_id UUID REFERENCES usuarios(id));CREATE TABLE public.pedidos(id UUID PRIMARY KEY)");
            sql(c,"INSERT INTO usuarios VALUES ('"+docente+"'),('"+alumno+"')");
            sql(c,"DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END$$");
            // Simula los privilegios por defecto de Supabase sobre objetos nuevos.
            sql(c,"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated");
            for(String name:List.of("migracion_aula_virtual_fase_a.sql","migracion_aula_virtual_e2.sql")) migration(c,name);
            String before=value(c,"SELECT json_agg(u)::text FROM usuarios u");
            migration(c,"migracion_certificaciones_fase_2.sql");
            assertThat(value(c,"SELECT json_agg(u)::text FROM usuarios u")).isEqualTo(before);
            assertThat(value(c,"SELECT count(*) FROM cursos")).isEqualTo("0");
            assertThat(value(c,"SELECT count(*) FROM pedidos")).isEqualTo("0");
        }
        var ds=new DriverManagerDataSource(URL,"aprobaciones_test","");jdbc=new JdbcTemplate(ds);
        factory=new LocalContainerEntityManagerFactoryBean();factory.setDataSource(ds);
        factory.setPackagesToScan("com.cursos.aula.tareas","com.cursos.certificaciones");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate"));factory.afterPropertiesSet();
        var emf=Objects.requireNonNull(factory.getObject());manager=new JpaTransactionManager(emf);
        em=SharedEntityManagerCreator.createSharedEntityManager(emf);var repos=new JpaRepositoryFactory(em);
        aprobaciones=repos.getRepository(AprobacionRepository.class);historial=repos.getRepository(RevisionAcademicaRepository.class);
        tareas=repos.getRepository(TareaRepository.class);evidencia=new EvidenciaAcademica(tareas);
        var cursos=mock(CursoRepository.class,withSettings().mockMaker(org.mockito.MockMakers.PROXY));
        when(cursos.findById(any())).thenAnswer(call->{
            var rows=jdbc.query("SELECT docente_id FROM cursos WHERE id=?",(rs,n)->{Curso c=new Curso();c.setDocenteId(rs.getObject(1,UUID.class));return c;},(UUID)call.getArgument(0));
            return rows.stream().findFirst();
        });
        matriculas=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        when(matriculas.habilitada(any(),any())).thenReturn(true);
        aula=new AulaService(cursos,null,null,matriculas,null);service=servicio(evidencia);
    }
    AprobacionService servicio(EvidenciaAcademica e){return new AprobacionService(aula,matriculas,aprobaciones,historial,e,jdbc,em,manager);}
    @AfterAll void cerrar(){if(factory!=null)factory.destroy();}
    Fixture fixture(String nota) {
        UUID curso=UUID.randomUUID(),modulo=UUID.randomUUID(),tarea=UUID.randomUUID(),entrega=UUID.randomUUID();
        jdbc.update("INSERT INTO cursos VALUES (?,?)",curso,docente);
        jdbc.update("INSERT INTO curso_modulos VALUES (?,?,'TEST',1)",modulo,curso);
        jdbc.update("INSERT INTO aula_tareas(id,modulo_id,titulo,consigna,fecha_limite,tipo_entrega,creado_por) VALUES (?,?,'TEST','TEST',CURRENT_TIMESTAMP,'TEXTO',?)",tarea,modulo,docente);
        if(nota!=null) jdbc.update("INSERT INTO aula_entregas(id,tarea_id,estudiante_id,estado,entregada_en,nota,retroalimentacion,calificado_por,calificada_en) VALUES (?,?,?,'CALIFICADA',CURRENT_TIMESTAMP,?,'TEST',?,CURRENT_TIMESTAMP)",entrega,tarea,alumno,new java.math.BigDecimal(nota),docente);
        return new Fixture(curso,modulo,tarea,entrega);
    }
    AprobacionService.Cambio cambio(Fixture f,RevisionAcademica.Decision d,long version) {
        return new AprobacionService.Cambio(d,"Decision docente justificada",version,service.evidencia(f.curso(),alumno,actor).evidenciaHash());
    }
    @Test void confirmaContradiceRevocaEHistorialInmutable() throws Exception {
        var f=fixture("10.00");var request=cambio(f,RevisionAcademica.Decision.APROBADO,-1);UUID key=UUID.randomUUID();
        var r=service.confirmar(f.curso(),alumno,request,key,actor);
        assertThat(r.evidencia().recomendacion().recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.NO_APTO);
        assertThat(r.docenteId()).isEqualTo(docente);assertThat(r.version()).isZero();assertThat(r.fecha()).isNotNull();
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isTrue();
        assertThat(service.confirmar(f.curso(),alumno,request,key,actor)).isEqualTo(r);
        var rev=service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.REVOCADO,0),UUID.randomUUID(),actor);
        assertThat(rev.version()).isEqualTo(1);assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isFalse();
        assertThat(service.confirmar(f.curso(),alumno,request,key,actor)).isEqualTo(r);
        assertThat(service.historial(f.curso(),alumno,0,1,actor).totalElements()).isEqualTo(2);
        assertThat(service.historial(f.curso(),alumno,1,1,actor).items().get(0).id()).isEqualTo(r.id());
        try(Connection c=connect()) {
            for(String sql:List.of("UPDATE aprobaciones_historial SET justificacion='otro' WHERE id='"+r.id()+"'",
                    "DELETE FROM aprobaciones_historial WHERE id='"+r.id()+"'","TRUNCATE aprobaciones_historial CASCADE"))
                assertThatThrownBy(()->sql(c,sql)).isInstanceOf(SQLException.class).satisfies(ex->assertThat(((SQLException)ex).getSQLState()).isEqualTo("23514"));
        }
    }
    @Test void evidenciaObsoletaNoConfirmaYRecalificacionInhabilita() {
        var f=fixture("15.00");var request=cambio(f,RevisionAcademica.Decision.APROBADO,-1);
        jdbc.update("UPDATE aula_entregas SET nota=10,version=version+1 WHERE id=?",f.entrega());
        conflicto(()->service.confirmar(f.curso(),alumno,request,UUID.randomUUID(),actor));
        assertThat(aprobaciones.findByCursoIdAndEstudianteId(f.curso(),alumno)).isEmpty();
        service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,-1),UUID.randomUUID(),actor);
        jdbc.update("UPDATE aula_entregas SET nota=16,version=version+1 WHERE id=?",f.entrega());
        assertThat(service.actual(f.curso(),alumno,actor).requiereRevision()).isTrue();
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isFalse();
        service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.NO_APROBADO,0),UUID.randomUUID(),actor);
        assertThat(service.actual(f.curso(),alumno,actor).requiereRevision()).isFalse();
    }
    @Test void sinDatosExigeDecisionExplicitaYCambiosDeTareasInvalidan() {
        var f=fixture(null);
        assertThat(service.evidencia(f.curso(),alumno,actor).evidencia().recomendacion().recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.SIN_DATOS_SUFICIENTES);
        assertThat(aprobaciones.findByCursoIdAndEstudianteId(f.curso(),alumno)).isEmpty();
        service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,-1),UUID.randomUUID(),actor);
        jdbc.update("UPDATE aula_tareas SET titulo='Editada',version=version+1 WHERE id=?",f.tarea());
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isFalse();
        service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,0),UUID.randomUUID(),actor);
        UUID otra=UUID.randomUUID();
        jdbc.update("INSERT INTO aula_tareas(id,modulo_id,titulo,consigna,fecha_limite,tipo_entrega,creado_por) VALUES (?,?,'Nueva','TEST',CURRENT_TIMESTAMP,'TEXTO',?)",otra,f.modulo(),docente);
        assertThat(service.actual(f.curso(),alumno,actor).requiereRevision()).isTrue();
        service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,1),UUID.randomUUID(),actor);
        jdbc.update("DELETE FROM aula_tareas WHERE id=?",otra);
        assertThat(service.actual(f.curso(),alumno,actor).requiereRevision()).isTrue();
    }
    @Test void clavesVersionesYJustificacion() {
        var f=fixture("11");var request=cambio(f,RevisionAcademica.Decision.APROBADO,-1);UUID key=UUID.randomUUID();
        service.confirmar(f.curso(),alumno,request,key,actor);
        conflicto(()->service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.NO_APROBADO,0),key,actor));
        conflicto(()->service.confirmar(f.curso(),alumno,request,UUID.randomUUID(),actor));
        assertThatThrownBy(()->service.confirmar(f.curso(),alumno,new AprobacionService.Cambio(RevisionAcademica.Decision.APROBADO," ",0,request.evidenciaHash()),UUID.randomUUID(),actor))
            .isInstanceOf(ResponseStatusException.class).satisfies(e->assertThat(((ResponseStatusException)e).getStatusCode().value()).isEqualTo(400));
        var otro=fixture("15");
        conflicto(()->service.confirmar(otro.curso(),alumno,cambio(otro,RevisionAcademica.Decision.APROBADO,-1),key,actor));
        assertThat(service.historial(f.curso(),alumno,0,20,actor).totalElements()).isEqualTo(1);
    }
    @Test void primeraConfirmacionConcurrenteEIdempotencia() throws Exception {
        var pool=Executors.newFixedThreadPool(2);
        try {
            for(boolean mismaClave:List.of(true,false)) {
                var f=fixture("14");var request=cambio(f,RevisionAcademica.Decision.APROBADO,-1);
                UUID key=UUID.randomUUID();var start=new CountDownLatch(1);
                List<Future<Object>> futures=new ArrayList<>();
                for(int i=0;i<2;i++) {UUID k=mismaClave?key:UUID.randomUUID();futures.add(pool.submit(()->{
                    start.await();try{return service.confirmar(f.curso(),alumno,request,k,actor);}catch(ResponseStatusException e){return e.getStatusCode().value();}
                }));}
                start.countDown();var results=List.of(futures.get(0).get(20,TimeUnit.SECONDS),futures.get(1).get(20,TimeUnit.SECONDS));
                if(mismaClave) assertThat(results.get(0)).isEqualTo(results.get(1));
                else assertThat(results.stream().filter(x->x instanceof AprobacionService.Revision).count()).isEqualTo(1);
                assertThat(service.historial(f.curso(),alumno,0,20,actor).totalElements()).isEqualTo(1);
            }
        } finally {pool.shutdownNow();}
    }
    @Test void confirmacionBloqueaRecalificacionHastaCommit() throws Exception {
        var f=fixture("15");var request=cambio(f,RevisionAcademica.Decision.APROBADO,-1);
        var leida=new CountDownLatch(1);var continuar=new CountDownLatch(1);var writerStarted=new CountDownLatch(1);
        EvidenciaAcademica pausada=new EvidenciaAcademica(tareas) {
            @Override public Vista leer(UUID c,UUID a) {
                Vista vista=super.leer(c,a);leida.countDown();
                try{if(!continuar.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Timeout test");}
                catch(InterruptedException ex){Thread.currentThread().interrupt();throw new IllegalStateException(ex);}return vista;
            }
        };
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmacion=pool.submit(()->servicio(pausada).confirmar(f.curso(),alumno,request,UUID.randomUUID(),actor));
            assertThat(leida.await(10,TimeUnit.SECONDS)).isTrue();
            var writer=pool.submit(()->{writerStarted.countDown();return jdbc.update("UPDATE aula_entregas SET nota=4,version=version+1 WHERE id=?",f.entrega());});
            assertThat(writerStarted.await(5,TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(()->writer.get(200,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            continuar.countDown();var r=confirmacion.get(10,TimeUnit.SECONDS);assertThat(writer.get(10,TimeUnit.SECONDS)).isEqualTo(1);
            assertThat(r.evidencia().recomendacion().promedio()).isEqualByComparingTo("15");
            assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isFalse();
        } finally {continuar.countDown();pool.shutdownNow();}
    }
    @Test void modificacionConcurrenteNoPierdeDecisiones() throws Exception {
        var f=fixture("14");service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,-1),UUID.randomUUID(),actor);
        var request=cambio(f,RevisionAcademica.Decision.NO_APROBADO,0);
        var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> work=()->{start.await();try{service.confirmar(f.curso(),alumno,request,UUID.randomUUID(),actor);return 200;}
                catch(ResponseStatusException e){return e.getStatusCode().value();}};
            var a=pool.submit(work);var b=pool.submit(work);start.countDown();
            assertThat(List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
            assertThat(service.historial(f.curso(),alumno,0,20,actor).totalElements()).isEqualTo(2);
        } finally{pool.shutdownNow();}
    }
    @Test void contratoHttpConPersistenciaReal() throws Exception {
        var f=fixture("12");String hash=service.evidencia(f.curso(),alumno,actor).evidenciaHash();
        var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new AprobacionController(service))
            .setControllerAdvice(new com.cursos.controller.ApiExceptionHandler())
            .addFilters(new com.cursos.security.JwtAuthFilter(new com.cursos.security.JwtVerifier(new com.fasterxml.jackson.databind.ObjectMapper(),RecomendacionHttpTest.SECRET,"cursos-service"))).build();
        String path="/api/cursos/"+f.curso()+"/aula/aprobaciones/"+alumno;
        String token=RecomendacionHttpTest.jwt(docente,"DOCENTE",60);UUID key=UUID.randomUUID();
        String body="{\"decision\":\"APROBADO\",\"justificacion\":\"Revision docente\",\"versionEsperada\":-1,\"evidenciaHash\":\""+hash+"\"}";
        for(int i=0;i<2;i++) mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
            .header("Authorization",token).header("Idempotency-Key",key).contentType(org.springframework.http.MediaType.APPLICATION_JSON).content(body))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Cache-Control","no-store"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.version").value(0));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path).header("Authorization",token))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.habilitaCertificacion").value(true));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path+"/revocaciones").header("Authorization",token)
            .header("Idempotency-Key",UUID.randomUUID()).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content("{\"justificacion\":\"Revocacion justificada\",\"versionEsperada\":0,\"evidenciaHash\":\""+hash+"\"}"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.decision").value("REVOCADO"));
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isFalse();
    }
    @Test void rlsYReferenciasImpedienHistoriaHuerfana() throws Exception {
        try(Connection c=connect()) {
            assertThat(value(c,"SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('aprobaciones_academicas'::regclass,'aprobaciones_historial'::regclass)")).isEqualTo("t");
            var f=fixture(null);c.setAutoCommit(false);
            sql(c,"INSERT INTO aprobaciones_academicas VALUES ('"+UUID.randomUUID()+"','"+f.curso()+"','"+alumno+"',0)");
            assertThatThrownBy(c::commit).isInstanceOf(SQLException.class);c.rollback();
        }
    }
    // ---------------- Fase 2: revision monotona, coordinacion por curso, hash canonico y emision ----------------
    long revision(UUID curso){Long r=jdbc.queryForObject("SELECT coalesce((SELECT revision FROM curso_revision_academica WHERE curso_id=?),0)",Long.class,curso);return r==null?0:r;}
    com.cursos.aula.tareas.TareaService tareaService() {
        var aulaTareas=mock(AulaService.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        var entregas=new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(em).getRepository(com.cursos.aula.tareas.EntregaRepository.class);
        var proxy=new org.springframework.aop.framework.ProxyFactory(new com.cursos.aula.tareas.TareaService(aulaTareas,tareas,entregas));
        proxy.addAdvice(new org.springframework.transaction.interceptor.TransactionInterceptor(manager,
            new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource()));
        return (com.cursos.aula.tareas.TareaService)proxy.getProxy();
    }
    com.cursos.aula.tareas.TareaController.Crear nuevaTarea(){
        return new com.cursos.aula.tareas.TareaController.Crear("Nueva","Consigna",java.time.Instant.parse("2030-01-01T00:00:00Z"),com.cursos.aula.tareas.Tarea.TipoEntrega.TEXTO);
    }
    @Test void revisionMonotonaCambiosRevertidosNuncaRecuperanVigencia() throws Exception {
        var f=fixture("12.00");var request=cambio(f,RevisionAcademica.Decision.APROBADO,-1);UUID key=UUID.randomUUID();
        var r=service.confirmar(f.curso(),alumno,request,key,actor);
        assertThat(r.revisionAcademica()).isEqualTo(revision(f.curso()));
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isTrue();
        long antes=revision(f.curso());
        // Nota cambiada y revertida (incluso sin tocar version): los datos vuelven a coincidir...
        jdbc.update("UPDATE aula_entregas SET nota=15 WHERE id=?",f.entrega());
        jdbc.update("UPDATE aula_entregas SET nota=12 WHERE id=?",f.entrega());
        assertThat(revision(f.curso())).isEqualTo(antes+2);
        // ...pero la aprobacion nunca recupera vigencia.
        assertThat(service.actual(f.curso(),alumno,actor).requiereRevision()).isTrue();
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isFalse();
        // Tarea creada y eliminada: mismo conjunto de tareas, sigue sin vigencia.
        UUID tmp=UUID.randomUUID();
        jdbc.update("INSERT INTO aula_tareas(id,modulo_id,titulo,consigna,fecha_limite,tipo_entrega,creado_por) VALUES (?,?,'T','T',CURRENT_TIMESTAMP,'TEXTO',?)",tmp,f.modulo(),docente);
        jdbc.update("DELETE FROM aula_tareas WHERE id=?",tmp);
        assertThat(revision(f.curso())).isEqualTo(antes+4);
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isFalse();
        // Idempotencia: la repeticion devuelve la revision historica original, no vigencia.
        assertThat(service.confirmar(f.curso(),alumno,request,key,actor)).isEqualTo(r);
        // La revision no puede reducirse, eliminarse ni truncarse.
        try(Connection c=connect()) {
            for(String s:List.of("UPDATE curso_revision_academica SET revision=0 WHERE curso_id='"+f.curso()+"'",
                    "DELETE FROM curso_revision_academica WHERE curso_id='"+f.curso()+"'","TRUNCATE curso_revision_academica"))
                assertThatThrownBy(()->sql(c,s)).isInstanceOf(SQLException.class).satisfies(ex->assertThat(((SQLException)ex).getSQLState()).isEqualTo("23514"));
        }
        // Nueva decision explicita sobre la revision vigente.
        service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,0),UUID.randomUUID(),actor);
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isTrue();
    }
    @Test void transaccionRevertidaNoCambiaRevisionNiVigencia() throws Exception {
        var f=fixture("13.00");service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,-1),UUID.randomUUID(),actor);
        long antes=revision(f.curso());
        try(Connection c=connect()) {
            c.setAutoCommit(false);
            sql(c,"UPDATE aula_entregas SET nota=5 WHERE id='"+f.entrega()+"'");
            sql(c,"INSERT INTO aula_tareas(id,modulo_id,titulo,consigna,fecha_limite,tipo_entrega,creado_por) VALUES ('"+UUID.randomUUID()+"','"+f.modulo()+"','T','T',CURRENT_TIMESTAMP,'TEXTO','"+docente+"')");
            c.rollback();
        }
        assertThat(revision(f.curso())).isEqualTo(antes);
        assertThat(service.actual(f.curso(),alumno,actor).habilitaCertificacion()).isTrue();
    }
    @Test void coordinacionPorCursoNoBloqueaOtrosCursos() throws Exception {
        var a=fixture("14");var b=fixture("14");var request=cambio(a,RevisionAcademica.Decision.APROBADO,-1);
        var tareaService=tareaService();var docenteActor=new AuthPrincipal(docente.toString(),"DOCENTE");
        var leida=new CountDownLatch(1);var continuar=new CountDownLatch(1);
        EvidenciaAcademica pausada=new EvidenciaAcademica(tareas) {
            @Override public Vista leer(UUID c,UUID al) {
                Vista v=super.leer(c,al);leida.countDown();
                try{if(!continuar.await(15,TimeUnit.SECONDS))throw new IllegalStateException("Timeout test");}
                catch(InterruptedException ex){Thread.currentThread().interrupt();throw new IllegalStateException(ex);}return v;
            }
        };
        var pool=Executors.newFixedThreadPool(4);
        try {
            var decision=pool.submit(()->servicio(pausada).confirmar(a.curso(),alumno,request,UUID.randomUUID(),actor));
            assertThat(leida.await(10,TimeUnit.SECONDS)).isTrue(); // la decision del curso A mantiene su bloqueo
            // Otro curso: escritor SQL y escritor de aplicacion avanzan sin esperar.
            assertThat(pool.submit(()->jdbc.update("UPDATE aula_entregas SET nota=9 WHERE id=?",b.entrega())).get(3,TimeUnit.SECONDS)).isEqualTo(1);
            assertThat(pool.submit(()->tareaService.crear(b.curso(),b.modulo(),nuevaTarea(),docenteActor)).get(3,TimeUnit.SECONDS).id()).isNotNull();
            // Mismo curso: el escritor de aplicacion espera al bloqueo del curso (orden curso -> tarea).
            var mismo=pool.submit(()->tareaService.crear(a.curso(),a.modulo(),nuevaTarea(),docenteActor));
            assertThatThrownBy(()->mismo.get(400,TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            continuar.countDown();
            var r=decision.get(10,TimeUnit.SECONDS);
            assertThat(mismo.get(10,TimeUnit.SECONDS).id()).isNotNull();
            assertThat(r.evidencia().tareas()).hasSize(1); // la tarea nueva no entro en la evidencia aprobada
            assertThat(revision(a.curso())).isGreaterThan(r.revisionAcademica());
            assertThat(service.actual(a.curso(),alumno,actor).habilitaCertificacion()).isFalse();
        } finally {continuar.countDown();pool.shutdownNow();}
    }
    @Test void emisionRevalidaMatriculaDecisionYEvidencia() {
        var f=fixture("15.00");service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,-1),UUID.randomUUID(),actor);
        var validador=new ValidadorEmision(matriculas,aprobaciones,historial,evidencia,jdbc,em,manager);
        var vigente=validador.conAprobacionVigente(f.curso(),alumno,v->v);
        assertThat(vigente.revisionAcademica()).isEqualTo(revision(f.curso()));
        assertThat(vigente.evidenciaHash()).isEqualTo(service.actual(f.curso(),alumno,actor).revision().evidenciaHash());
        // Matricula no PAGADO: se rechaza antes de abrir transaccion.
        var sinPago=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        when(sinPago.habilitada(any(),any())).thenReturn(false);
        var emitido=new java.util.concurrent.atomic.AtomicBoolean();
        assertThatThrownBy(()->new ValidadorEmision(sinPago,aprobaciones,historial,evidencia,jdbc,em,manager)
            .conAprobacionVigente(f.curso(),alumno,v->{emitido.set(true);return v;})).isInstanceOf(AuthPrincipal.ForbiddenException.class);
        // Pedidos caido: no hay emision.
        var caido=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        when(caido.habilitada(any(),any())).thenThrow(new MatriculaClient.NoDisponibleException());
        assertThatThrownBy(()->new ValidadorEmision(caido,aprobaciones,historial,evidencia,jdbc,em,manager)
            .conAprobacionVigente(f.curso(),alumno,v->{emitido.set(true);return v;})).isInstanceOf(MatriculaClient.NoDisponibleException.class);
        // Cambio academico (aunque deje la misma nota): ya no es emitible.
        jdbc.update("UPDATE aula_entregas SET nota=15 WHERE id=?",f.entrega());
        conflicto(()->validador.conAprobacionVigente(f.curso(),alumno,v->{emitido.set(true);return v;}));
        // Decision vigente NO_APROBADO: no es emitible.
        service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.NO_APROBADO,0),UUID.randomUUID(),actor);
        conflicto(()->validador.conAprobacionVigente(f.curso(),alumno,v->{emitido.set(true);return v;}));
        assertThat(emitido).isFalse();
    }
    @Test void hashCanonicoDeterministaSinTextosYVerificadoPorPostgres() throws Exception {
        var f=fixture("12.5");
        var v1=evidencia.leer(f.curso(),alumno);var v2=evidencia.leer(f.curso(),alumno);
        assertThat(v1.canonica()).isEqualTo(v2.canonica()).startsWith("{\"esquema\":\"evidencia-academica/v2\"")
            .contains("\"revisionAcademica\":"+revision(f.curso())).contains("\"nota\":\"12.50\"")
            .doesNotContain("explicacion").doesNotContain("No constituye").doesNotContain("Promedio simple");
        assertThat(EvidenciaAcademica.hash(v1.canonica())).isEqualTo(v1.evidenciaHash());
        var r=service.confirmar(f.curso(),alumno,cambio(f,RevisionAcademica.Decision.APROBADO,-1),UUID.randomUUID(),actor);
        try(Connection c=connect()) {
            assertThat(value(c,"SELECT evidencia_hash = encode(sha256(convert_to(evidencia_canonica,'UTF8')),'hex') FROM aprobaciones_historial WHERE id='"+r.id()+"'")).isEqualTo("t");
            c.setAutoCommit(false);
            String falso="0".repeat(64);
            assertThatThrownBy(()->sql(c,"INSERT INTO aprobaciones_historial(id,aprobacion_id,version,docente_id,decision,justificacion,evidencia,revision_academica,evidencia_canonica,evidencia_hash,idempotencia,solicitud_hash) "
                +"SELECT '"+UUID.randomUUID()+"',aprobacion_id,99,docente_id,'APROBADO','x',evidencia,revision_academica,evidencia_canonica,'"+falso+"','"+UUID.randomUUID()+"','"+falso+"' FROM aprobaciones_historial WHERE id='"+r.id()+"'"))
                .isInstanceOf(SQLException.class).satisfies(ex->assertThat(((SQLException)ex).getSQLState()).isEqualTo("23514"));
            c.rollback();
        }
    }
    @Test void privilegiosRevocadosYRlsEnTablasNuevas() throws Exception {
        try(Connection c=connect()) {
            assertThat(value(c,"SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('curso_revision_academica'::regclass,'aprobaciones_academicas'::regclass,'aprobaciones_historial'::regclass)")).isEqualTo("t");
            assertThat(value(c,"SELECT count(*) FROM pg_policies WHERE tablename IN ('curso_revision_academica','aprobaciones_academicas','aprobaciones_historial')")).isEqualTo("0");
            for(String rol:List.of("anon","authenticated"))
                assertThat(value(c,"SELECT bool_or(has_table_privilege('"+rol+"',t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')) FROM unnest(ARRAY['curso_revision_academica','aprobaciones_academicas','aprobaciones_historial']) t")).isEqualTo("f");
            assertThat(value(c,"SELECT has_function_privilege('anon','public.incrementar_revision_academica(uuid)','EXECUTE')")).isEqualTo("f");
        }
    }
    static void conflicto(Runnable action){assertThatThrownBy(action::run).isInstanceOf(ResponseStatusException.class)
        .satisfies(e->assertThat(((ResponseStatusException)e).getStatusCode().value()).isEqualTo(409));}
    static void migration(Connection c,String name)throws Exception {Path p=Path.of("../database",name);if(!Files.exists(p))p=Path.of("database",name);sql(c,Files.readString(p));}
    static void sql(Connection c,String sql)throws SQLException{try(var s=c.createStatement()){s.execute(sql);}}
    static String value(Connection c,String sql)throws SQLException{try(var s=c.createStatement();var r=s.executeQuery(sql)){r.next();return r.getString(1);}}
}
