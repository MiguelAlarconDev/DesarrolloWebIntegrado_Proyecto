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
import org.springframework.transaction.*;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@EnabledIfSystemProperty(named="aula.postgres.test",matches="true")
class EntregaPostgresTest {
    static final String URL="jdbc:postgresql://127.0.0.1:55439/entregas_validation";
    @Test void concurrenciaReemplazoRollbackYCommitAmbiguo() throws Exception {
        try(Connection db=DriverManager.getConnection(URL,"aula_test","")){
            assertThat(TareaPostgresTest.value(db,"SHOW cluster_name")).isEqualTo("aula-isolated-validation");
            assertThat(TareaPostgresTest.value(db,"SELECT current_database()")).isEqualTo("entregas_validation");
            assertThat(TareaPostgresTest.value(db,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).isEqualTo("0");
            UUID alumno=UUID.randomUUID(), docente=UUID.randomUUID(), curso=UUID.randomUUID(), modulo=UUID.randomUUID();
            TareaPostgresTest.sql(db,"CREATE TABLE usuarios(id uuid PRIMARY KEY); CREATE TABLE cursos(id uuid PRIMARY KEY)");
            TareaPostgresTest.sql(db,"INSERT INTO usuarios VALUES('"+alumno+"'),('"+docente+"'); INSERT INTO cursos VALUES('"+curso+"')");
            TareaPostgresTest.migration(db,"migracion_aula_virtual_fase_a.sql");
            TareaPostgresTest.migration(db,"migracion_aula_virtual_e2.sql");
            TareaPostgresTest.migration(db,"migracion_certificaciones_fase_2.sql");
            TareaPostgresTest.sql(db,"INSERT INTO curso_modulos VALUES('"+modulo+"','"+curso+"','M',1)");
            var factory=new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(new DriverManagerDataSource(URL,"aula_test",""));
            factory.setPackagesToScan("com.cursos.aula.tareas");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate"));
            factory.afterPropertiesSet();
            try{
                var emf=Objects.requireNonNull(factory.getObject());
                var em=SharedEntityManagerCreator.createSharedEntityManager(emf);
                var repos=new JpaRepositoryFactory(em);
                var tareas=repos.getRepository(TareaRepository.class);
                var entregas=repos.getRepository(EntregaRepository.class);
                var archivosReales=repos.getRepository(EntregaArchivoRepository.class);
                AtomicBoolean failSql=new AtomicBoolean();
                var archivos=mock(EntregaArchivoRepository.class,withSettings().mockMaker(org.mockito.MockMakers.PROXY)
                    .defaultAnswer(org.mockito.AdditionalAnswers.delegatesTo(archivosReales)));
                doAnswer(inv->{
                    if(failSql.getAndSet(false))throw new org.springframework.dao.DataAccessResourceFailureException("simulated DB failure");
                    return archivosReales.saveAndFlush(inv.getArgument(0));
                }).when(archivos).saveAndFlush(any());
                var cursos=TareaHttpTest.repo(CursoRepository.class);
                var modulos=TareaHttpTest.repo(ModuloRepository.class);
                var matriculas=mock(MatriculaClient.class,withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
                Curso c=new Curso();c.setDocenteId(docente);
                when(cursos.findById(curso)).thenReturn(Optional.of(c));
                when(modulos.findByIdAndCursoId(modulo,curso)).thenReturn(Optional.of(new Modulo(curso,"M",1)));
                when(matriculas.habilitada(curso,alumno)).thenReturn(true);
                FakeStorage storage=new FakeStorage();
                AulaService aula=new AulaService(cursos,modulos,TareaHttpTest.repo(MaterialRepository.class),matriculas,storage);
                MutableClock clock=new MutableClock();
                AtomicBoolean loseCommitAck=new AtomicBoolean();
                JpaTransactionManager realManager=new JpaTransactionManager(emf);
                PlatformTransactionManager manager=new PlatformTransactionManager(){
                    public TransactionStatus getTransaction(TransactionDefinition d){return realManager.getTransaction(d);}
                    public void rollback(TransactionStatus s){realManager.rollback(s);}
                    public void commit(TransactionStatus s){
                        realManager.commit(s);
                        if(loseCommitAck.getAndSet(false))throw new TransactionSystemException("simulated lost commit acknowledgement");
                    }
                };
                EntregaService service=new EntregaService(aula,tareas,entregas,archivos,storage,manager,clock);
                AuthPrincipal principal=new AuthPrincipal(alumno.toString(),"ESTUDIANTE");
                UUID tarea;
                try(var writer=emf.createEntityManager()){
                    writer.getTransaction().begin();
                    Tarea t=new Tarea(modulo,"T","C",clock.instant().plusSeconds(60),Tarea.TipoEntrega.AMBOS,docente);
                    writer.persist(t);writer.getTransaction().commit();tarea=t.getId();
                }
                var file=new EntregaService.Adjunto("respuesta.pdf","application/pdf","%PDF-1.7 test".getBytes());
                // Both requests pass preflight and upload before either final transaction starts.
                CyclicBarrier bothUploaded=new CyclicBarrier(2);
                storage.hook=()->{
                    try{bothUploaded.await(5,TimeUnit.SECONDS);}
                    catch(Exception ex){throw new IllegalStateException(ex);}
                };
                ExecutorService pool=Executors.newFixedThreadPool(2);
                try{
                    Callable<Integer> send=()->{
                        try{service.entregar(curso,modulo,tarea,-1,"original",file,principal);return 200;}
                        catch(ResponseStatusException ex){return ex.getStatusCode().value();}
                    };
                    Future<Integer> a=pool.submit(send),b=pool.submit(send);
                    assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
                }finally{pool.shutdownNow();storage.hook=()->{};}
                assertThat(TareaPostgresTest.value(db,"SELECT count(*) FROM aula_entregas")).isEqualTo("1");
                assertThat(TareaPostgresTest.value(db,"SELECT count(*) FROM aula_entrega_archivos")).isEqualTo("1");
                assertThat(storage.objects).hasSize(1);
                var original=service.propia(curso,modulo,tarea,principal);
                assertThat(original.estado()).isEqualTo(Entrega.Estado.ENTREGADA);

                // While a replacement is uploading, readers still see the previous complete version.
                storage.hook=()->assertThat(service.propia(curso,modulo,tarea,principal).texto()).isEqualTo("original");
                var replacement=service.entregar(curso,modulo,tarea,original.version(),"nueva",file,principal);
                storage.hook=()->{};
                assertThat(replacement.id()).isEqualTo(original.id());
                assertThat(replacement.version()).isGreaterThan(original.version());
                assertThat(storage.objects).hasSize(1);
                // Same clock instant, same text, file-only replacement still consumes a version.
                var same=service.entregar(curso,modulo,tarea,replacement.version(),"nueva",file,principal);
                assertThat(same.version()).isGreaterThan(replacement.version());

                // Provider stores bytes but returns a timeout: old submission remains intact.
                storage.failUpload=true;
                assertThatThrownBy(()->service.entregar(curso,modulo,tarea,same.version(),"fallida",file,principal))
                    .isInstanceOf(AlmacenamientoArchivos.NoDisponibleException.class);
                storage.failUpload=false;
                assertThat(service.propia(curso,modulo,tarea,principal).version()).isEqualTo(same.version());
                assertThat(storage.objects).hasSize(1);

                // PostgreSQL rolls back the delivery/version change if attachment persistence fails.
                failSql.set(true);
                assertThatThrownBy(()->service.entregar(curso,modulo,tarea,same.version(),"fallida DB",file,principal))
                    .isInstanceOf(ResponseStatusException.class);
                assertThat(service.propia(curso,modulo,tarea,principal).texto()).isEqualTo("nueva");
                assertThat(service.propia(curso,modulo,tarea,principal).version()).isEqualTo(same.version());
                assertThat(storage.objects).hasSize(1);

                // The database commits successfully but the caller loses the acknowledgement.
                storage.hook=()->loseCommitAck.set(true);
                assertThatThrownBy(()->service.entregar(curso,modulo,tarea,same.version(),"confirmada",file,principal))
                    .isInstanceOf(ResponseStatusException.class);
                storage.hook=()->{};
                var committed=service.propia(curso,modulo,tarea,principal);
                assertThat(committed.texto()).isEqualTo("confirmada");
                String activeKey=TareaPostgresTest.value(db,"SELECT object_key FROM aula_entrega_archivos");
                assertThat(storage.objects).containsKey(activeKey);
                assertThat(service.descargar(curso,modulo,tarea,principal).url()).isEqualTo("https://storage.invalid/signed");

                // Cleanup failure does not invalidate a confirmed replacement.
                storage.failDelete=true;
                var retained=service.entregar(curso,modulo,tarea,committed.version(),"guardada",file,principal);
                assertThat(service.propia(curso,modulo,tarea,principal).texto()).isEqualTo("guardada");
                assertThat(storage.objects.size()).isGreaterThan(1);
                storage.failDelete=false;

                // A complete text-only replacement removes the previous attachment reference.
                var textOnly=service.entregar(curso,modulo,tarea,retained.version(),"solo texto",null,principal);
                assertThat(textOnly.archivo()).isNull();
                assertThat(TareaPostgresTest.value(db,"SELECT count(*) FROM aula_entrega_archivos")).isEqualTo("0");
                assertThatThrownBy(()->service.descargar(curso,modulo,tarea,principal)).isInstanceOf(ResponseStatusException.class);

                // Deadline is checked again AFTER upload; no incomplete record replaces the original.
                Instant start=clock.instant();
                storage.hook=()->clock.now.set(start.plusSeconds(61));
                assertThatThrownBy(()->service.entregar(curso,modulo,tarea,textOnly.version(),"tarde",file,principal))
                    .isInstanceOf(ResponseStatusException.class);
                storage.hook=()->{};
                assertThat(service.propia(curso,modulo,tarea,principal).texto()).isEqualTo("solo texto");
                clock.now.set(start);
                // Only test data: prove that preexisting grading blocks replacement without implementing grading.
                TareaPostgresTest.sql(db,"UPDATE aula_entregas SET estado='CALIFICADA',nota=20,retroalimentacion='TEST_ONLY',calificado_por='"+docente+"',calificada_en=CURRENT_TIMESTAMP");
                assertThatThrownBy(()->service.entregar(curso,modulo,tarea,textOnly.version(),"no",null,principal))
                    .isInstanceOf(ResponseStatusException.class);
                System.out.println("E3 PostgreSQL: double-send, forced versions, atomic replacement, DB rollback, ambiguous commit, Storage failures and deadline OK");
            }finally{factory.destroy();}
        }
    }
    static class MutableClock extends Clock{
        final AtomicReference<Instant> now=new AtomicReference<>(Instant.parse("2030-01-01T12:00:00Z"));
        public ZoneId getZone(){return ZoneOffset.UTC;}
        public Clock withZone(ZoneId zone){return this;}
        public Instant instant(){return now.get();}
    }
    static class FakeStorage implements AlmacenamientoArchivos{
        final Map<String,byte[]> objects=new ConcurrentHashMap<>();
        volatile Runnable hook=()->{};
        volatile boolean failUpload,failDelete;
        public boolean isConfigurado(){return true;}
        public void subir(String key,byte[] bytes,String mime){
            objects.put(key,bytes);
            if(failUpload)throw new NoDisponibleException("simulated timeout after storing");
            hook.run();
        }
        public void eliminar(String key){if(failDelete)throw new NoDisponibleException("simulated delete failure");objects.remove(key);}
        public String urlFirmada(String key,Duration duration,String name){
            assertThat(duration).isEqualTo(Duration.ofSeconds(60));
            assertThat(objects).containsKey(key);
            return "https://storage.invalid/signed";
        }
    }
}
