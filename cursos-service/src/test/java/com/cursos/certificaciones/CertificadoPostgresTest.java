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

import java.math.BigDecimal;
import java.nio.file.*;
import java.sql.*;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Emision real sobre PostgreSQL AISLADO (127.0.0.1:55442, base vacia certificados_validation,
 * cluster_name aprobaciones-isolated-validation). Storage simulado en memoria; Auth y Pedidos simulados.
 */
@EnabledIfSystemProperty(named = "certificados.postgres.test", matches = "true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CertificadoPostgresTest {
    static final String URL = "jdbc:postgresql://127.0.0.1:55442/certificados_validation";
    final UUID docente = UUID.randomUUID(), admin = UUID.randomUUID(), adminB = UUID.randomUUID();
    final AuthPrincipal actorDocente = new AuthPrincipal(docente.toString(), "DOCENTE");
    final AuthPrincipal actorAdmin = new AuthPrincipal(admin.toString(), "ADMIN");
    final AuthPrincipal actorAdminB = new AuthPrincipal(adminB.toString(), "ADMIN");
    LocalContainerEntityManagerFactoryBean factory;
    JdbcTemplate jdbc; EntityManager em; JpaTransactionManager manager;
    AprobacionRepository aprobaciones; RevisionAcademicaRepository historial; TareaRepository tareas;
    CertificadoRepository certificados; CertificadoEventoRepository eventos;
    MatriculaClient matriculas; AprobacionService decisiones; EvidenciaAcademica evidencia; CursoRepository cursos;
    UsuarioClient usuarios; StorageFalso storage; CertificadoService service;

    /** Storage privado simulado en memoria, con ganchos para fallos. */
    static class StorageFalso implements AlmacenamientoArchivos {
        final Map<String, byte[]> objetos = new ConcurrentHashMap<>();
        volatile boolean fallarSubida;
        volatile Runnable alSubir = () -> {};
        public boolean isConfigurado() { return true; }
        public void subir(String key, byte[] contenido, String mime) {
            if (fallarSubida) throw new NoDisponibleException("caido");
            if (objetos.putIfAbsent(key, contenido) != null) throw new NoDisponibleException("duplicado");
            alSubir.run();
        }
        public void eliminar(String key) { objetos.remove(key); }
        public String urlFirmada(String key, Duration vigencia, String nombre) {
            if (!objetos.containsKey(key)) throw new NoDisponibleException("no existe");
            return "https://storage.invalid/" + key + "?token=t";
        }
    }

    record Fixture(UUID curso, UUID modulo, UUID tarea, UUID entrega, UUID alumno) {}

    Connection connect() throws SQLException { return DriverManager.getConnection(URL, "aprobaciones_test", ""); }

    @BeforeAll
    void preparar() throws Exception {
        try (Connection c = connect()) {
            assertThat(value(c, "SHOW cluster_name")).isEqualTo("aprobaciones-isolated-validation");
            assertThat(value(c, "SELECT current_database()")).isEqualTo("certificados_validation");
            assertThat(value(c, "SELECT host(inet_server_addr())")).isEqualTo("127.0.0.1");
            assertThat(value(c, "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).isEqualTo("0");
            sql(c, "DO $$BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; "
                    + "IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END$$");
            sql(c, "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated");
            sql(c, "CREATE TABLE public.usuarios(id UUID PRIMARY KEY); CREATE TABLE public.cursos(id UUID PRIMARY KEY, docente_id UUID REFERENCES usuarios(id), titulo VARCHAR(200)); CREATE TABLE public.pedidos(id UUID PRIMARY KEY)");
            sql(c, "INSERT INTO usuarios VALUES ('" + docente + "'),('" + admin + "'),('" + adminB + "')");
            for (String m : List.of("migracion_aula_virtual_fase_a.sql", "migracion_aula_virtual_e2.sql",
                    "migracion_certificaciones_fase_2.sql", "migracion_certificaciones_fase_3.sql")) migration(c, m);
        }
        var ds = new DriverManagerDataSource(URL, "aprobaciones_test", "");
        jdbc = new JdbcTemplate(ds);
        factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(ds);
        factory.setPackagesToScan("com.cursos.aula.tareas", "com.cursos.certificaciones");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate"));
        factory.afterPropertiesSet();
        var emf = Objects.requireNonNull(factory.getObject());
        manager = new JpaTransactionManager(emf);
        em = SharedEntityManagerCreator.createSharedEntityManager(emf);
        var repos = new JpaRepositoryFactory(em);
        aprobaciones = repos.getRepository(AprobacionRepository.class);
        historial = repos.getRepository(RevisionAcademicaRepository.class);
        tareas = repos.getRepository(TareaRepository.class);
        certificados = repos.getRepository(CertificadoRepository.class);
        eventos = repos.getRepository(CertificadoEventoRepository.class);
        evidencia = new EvidenciaAcademica(tareas);
        cursos = mock(CursoRepository.class, withSettings().mockMaker(org.mockito.MockMakers.PROXY));
        when(cursos.findById(any())).thenAnswer(call -> jdbc.query("SELECT docente_id, titulo FROM cursos WHERE id=?", (rs, n) -> {
            Curso c = new Curso(); c.setDocenteId(rs.getObject(1, UUID.class)); c.setTitulo(rs.getString(2)); return c;
        }, (UUID) call.getArgument(0)).stream().findFirst());
        matriculas = mock(MatriculaClient.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        when(matriculas.habilitada(any(), any())).thenReturn(true);
        usuarios = mock(UsuarioClient.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        when(usuarios.nombre(any())).thenReturn(Optional.of("Ana María Pérez Gómez"));
        when(usuarios.nombres()).thenReturn(Map.of());
        var aula = new AulaService(cursos, null, null, matriculas, null);
        decisiones = new AprobacionService(aula, matriculas, aprobaciones, historial, evidencia, jdbc, em, manager);
        storage = new StorageFalso();
        service = servicio(matriculas);
    }

    CertificadoService servicio(MatriculaClient m) {
        var validador = new ValidadorEmision(m, aprobaciones, historial, evidencia, jdbc, em, manager);
        return new CertificadoService(validador, certificados, eventos, cursos, usuarios, storage, jdbc, manager,
                "http://localhost:4200/verificar-certificado", Clock.systemUTC());
    }

    @AfterAll void cerrar() { if (factory != null) factory.destroy(); }

    @BeforeEach void reiniciarStorage() { storage.fallarSubida = false; storage.alSubir = () -> {}; }

    Fixture fixture(String nota) {
        UUID curso = UUID.randomUUID(), modulo = UUID.randomUUID(), tarea = UUID.randomUUID(), entrega = UUID.randomUUID(), alumno = UUID.randomUUID();
        jdbc.update("INSERT INTO usuarios VALUES (?)", alumno);
        jdbc.update("INSERT INTO cursos VALUES (?,?,?)", curso, docente, "Desarrollo Web Integrado");
        jdbc.update("INSERT INTO curso_modulos VALUES (?,?,'Semana 1',1)", modulo, curso);
        jdbc.update("INSERT INTO aula_tareas(id,modulo_id,titulo,consigna,fecha_limite,tipo_entrega,creado_por) VALUES (?,?,'T','T',CURRENT_TIMESTAMP,'TEXTO',?)", tarea, modulo, docente);
        jdbc.update("INSERT INTO aula_entregas(id,tarea_id,estudiante_id,estado,entregada_en,nota,retroalimentacion,calificado_por,calificada_en) VALUES (?,?,?,'CALIFICADA',CURRENT_TIMESTAMP,?,'OK',?,CURRENT_TIMESTAMP)",
                entrega, tarea, alumno, new BigDecimal(nota), docente);
        return new Fixture(curso, modulo, tarea, entrega, alumno);
    }

    AprobacionService.Revision decidir(Fixture f, RevisionAcademica.Decision d, long version) {
        String hash = decisiones.evidencia(f.curso(), f.alumno(), actorDocente).evidenciaHash();
        return decisiones.confirmar(f.curso(), f.alumno(), new AprobacionService.Cambio(d, "Decision docente justificada", version, hash),
                UUID.randomUUID(), actorDocente);
    }

    Fixture aprobado(String nota) { var f = fixture(nota); decidir(f, RevisionAcademica.Decision.APROBADO, -1); return f; }

    int activos(Fixture f) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM certificados_academicos WHERE curso_id=? AND estudiante_id=? AND estado IN ('PENDIENTE','EMITIDO')", Integer.class, f.curso(), f.alumno());
        return n == null ? 0 : n;
    }

    @Test
    void emiteGuardaPdfPrivadoEventosYVerificacion() {
        var f = aprobado("15.00");
        var v = service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin);
        assertThat(v.estado()).isEqualTo(Certificado.Estado.EMITIDO);
        assertThat(v.codigo()).matches("DWI-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}");
        Certificado c = certificados.findById(v.id()).orElseThrow();
        byte[] pdf = storage.objetos.get(c.getObjectKey());
        assertThat(pdf).isNotNull();
        assertThat(CertificadoService.sha256(pdf)).isEqualTo(c.getPdfSha256());
        assertThat(new String(pdf, java.nio.charset.Charset.forName("windows-1252"))).contains(v.codigo()).contains("Ana María Pérez Gómez")
                .contains("Desarrollo Web Integrado");
        assertThat(c.getHistorialId()).isEqualTo(decisiones.actual(f.curso(), f.alumno(), actorDocente).revision().id());
        assertThat(service.eventos(v.id())).extracting(CertificadoService.Evento::evento)
                .containsExactly(CertificadoEvento.Tipo.EMISION_INICIADA, CertificadoEvento.Tipo.EMITIDO);
        var ver = service.verificar(v.codigo().toLowerCase());
        assertThat(ver.valido()).isTrue();
        assertThat(ver.estudiante()).isEqualTo("Ana M. P. G.");
        assertThat(ver.pdfSha256()).isEqualTo(c.getPdfSha256());
        // Estudiante: solo lo propio.
        var propio = new AuthPrincipal(f.alumno().toString(), "ESTUDIANTE");
        assertThat(service.mios(propio)).extracting(CertificadoService.Vista::id).containsExactly(v.id());
        assertThat(service.mios(new AuthPrincipal(UUID.randomUUID().toString(), "ESTUDIANTE"))).isEmpty();
        assertThat(service.descargar(v.id(), propio).url()).startsWith("https://");
        assertThatThrownBy(() -> service.descargar(v.id(), new AuthPrincipal(UUID.randomUUID().toString(), "ESTUDIANTE")))
                .isInstanceOf(ResponseStatusException.class);
        // Listado ADMIN de aprobados vigentes refleja el certificado.
        var fila = service.aprobadosVigentes(0, 100).items().stream().filter(a -> a.estudianteId().equals(f.alumno())).findFirst().orElseThrow();
        assertThat(fila.certificadoEstado()).isEqualTo(Certificado.Estado.EMITIDO);
        assertThat(fila.cursoTitulo()).isEqualTo("Desarrollo Web Integrado");
    }

    @Test
    void idempotenciaYSinDuplicados() {
        var f = aprobado("14.00");
        UUID clave = UUID.randomUUID();
        var a = service.emitir(f.curso(), f.alumno(), clave, actorAdmin);
        var b = service.emitir(f.curso(), f.alumno(), clave, actorAdmin);
        assertThat(b).isEqualTo(a);
        assertThat(storage.objetos.keySet().stream().filter(k -> k.contains(f.alumno().toString()))).hasSize(1);
        conflicto(() -> service.emitir(f.curso(), UUID.randomUUID(), clave, actorAdmin));   // misma clave, otra solicitud
        conflicto(() -> service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin)); // ya emitido
        conflicto(() -> service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdminB));
        assertThat(activos(f)).isEqualTo(1);
    }

    @Test
    void emisionesConcurrentesProducenUnSoloCertificado() throws Exception {
        var f = aprobado("16.00");
        var pool = Executors.newFixedThreadPool(4);
        try {
            var start = new CountDownLatch(1);
            List<Future<Object>> res = new ArrayList<>();
            for (AuthPrincipal p : List.of(actorAdmin, actorAdminB, actorAdmin, actorAdminB)) {
                res.add(pool.submit(() -> {
                    start.await();
                    try { return service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), p); }
                    catch (ResponseStatusException e) { return e.getStatusCode().value(); }
                }));
            }
            start.countDown();
            List<Object> r = new ArrayList<>();
            for (var fut : res) r.add(fut.get(30, TimeUnit.SECONDS));
            assertThat(r.stream().filter(x -> x instanceof CertificadoService.Vista)).hasSize(1);
            assertThat(r.stream().filter(x -> Integer.valueOf(409).equals(x))).hasSize(3);
            assertThat(activos(f)).isEqualTo(1);
        } finally { pool.shutdownNow(); }
    }

    @Test
    void noEmiteSobreDecisionesNoVigentes() {
        // Desactualizada: la nota cambia (y se restaura) despues de aprobar.
        var f = aprobado("13.00");
        jdbc.update("UPDATE aula_entregas SET nota=18 WHERE id=?", f.entrega());
        jdbc.update("UPDATE aula_entregas SET nota=13 WHERE id=?", f.entrega());
        conflicto(() -> service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin));
        // NO_APROBADO
        var g = fixture("10.00"); decidir(g, RevisionAcademica.Decision.NO_APROBADO, -1);
        conflicto(() -> service.emitir(g.curso(), g.alumno(), UUID.randomUUID(), actorAdmin));
        // REVOCADO
        var h = aprobado("17.00"); decidir(h, RevisionAcademica.Decision.REVOCADO, 0);
        conflicto(() -> service.emitir(h.curso(), h.alumno(), UUID.randomUUID(), actorAdmin));
        // Sin decision
        var i = fixture("12.00");
        conflicto(() -> service.emitir(i.curso(), i.alumno(), UUID.randomUUID(), actorAdmin));
        for (var x : List.of(f, g, h, i)) assertThat(activos(x)).isZero();
        // Sin matricula PAGADO: 403 antes de reservar nada.
        var j = aprobado("15.00");
        var sinPago = mock(MatriculaClient.class, withSettings().mockMaker(org.mockito.MockMakers.SUBCLASS));
        when(sinPago.habilitada(any(), any())).thenReturn(false);
        assertThatThrownBy(() -> servicio(sinPago).emitir(j.curso(), j.alumno(), UUID.randomUUID(), actorAdmin))
                .isInstanceOf(AuthPrincipal.ForbiddenException.class);
        assertThat(activos(j)).isZero();
        assertThat(storage.objetos.keySet().stream().filter(k -> k.contains(j.alumno().toString()))).isEmpty();
    }

    @Test
    void falloDeStorageQuedaFallidoYPermiteReintento() {
        var f = aprobado("15.00");
        storage.fallarSubida = true;
        UUID clave = UUID.randomUUID();
        assertThatThrownBy(() -> service.emitir(f.curso(), f.alumno(), clave, actorAdmin)).isInstanceOf(AlmacenamientoArchivos.NoDisponibleException.class);
        var fallido = service.emitir(f.curso(), f.alumno(), clave, actorAdmin); // misma clave: estado real, sin reintento implicito
        assertThat(fallido.estado()).isEqualTo(Certificado.Estado.FALLIDO);
        assertThat(service.eventos(fallido.id())).extracting(CertificadoService.Evento::evento)
                .containsExactly(CertificadoEvento.Tipo.EMISION_INICIADA, CertificadoEvento.Tipo.FALLIDO);
        storage.fallarSubida = false;
        assertThat(service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin).estado()).isEqualTo(Certificado.Estado.EMITIDO);
        assertThat(activos(f)).isEqualTo(1);
    }

    @Test
    void cambioAcademicoDuranteLaSubidaInvalidaLaEmision() {
        var f = aprobado("15.00");
        // La subida ocurre sin bloqueos: un escritor puede cambiar la evidencia en ese intervalo.
        storage.alSubir = () -> jdbc.update("UPDATE aula_entregas SET nota=9 WHERE id=?", f.entrega());
        conflicto(() -> service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin));
        assertThat(activos(f)).isZero();
        assertThat(storage.objetos.keySet().stream().filter(k -> k.contains(f.alumno().toString()))).isEmpty();
        Integer fallidos = jdbc.queryForObject("SELECT count(*) FROM certificados_academicos WHERE estudiante_id=? AND estado='FALLIDO'", Integer.class, f.alumno());
        assertThat(fallidos).isEqualTo(1);
    }

    @Test
    void emisionAbandonadaSeReemplazaTrasElPlazo() {
        var f = aprobado("15.00");
        var r = decisiones.actual(f.curso(), f.alumno(), actorDocente).revision();
        String key = "certificados/" + f.curso() + "/" + f.alumno() + "/abandonado.pdf";
        storage.objetos.put(key, new byte[]{1});
        jdbc.update("INSERT INTO certificados_academicos(id,codigo,curso_id,estudiante_id,aprobacion_id,historial_id,revision_academica,evidencia_hash,"
                + "estudiante_nombre,curso_titulo,emitido_por,idempotencia,fecha_emision,object_key,pdf_sha256,tamano_bytes,estado,created_at,actualizado_en) "
                + "VALUES (?,?,?,?,?,?,?,?,'Ana','Curso',?,?,now()-interval '10 minutes',?,?,1,'PENDIENTE',now()-interval '10 minutes',now()-interval '10 minutes')",
                UUID.randomUUID(), CertificadoService.nuevoCodigo(), f.curso(), f.alumno(), r.aprobacionId(), r.id(), r.revisionAcademica(),
                r.evidenciaHash(), admin, UUID.randomUUID(), key, "c".repeat(64));
        var v = service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin);
        assertThat(v.estado()).isEqualTo(Certificado.Estado.EMITIDO);
        assertThat(storage.objetos).doesNotContainKey(key);
        assertThat(activos(f)).isEqualTo(1);
    }

    @Test
    void certificadosEHistorialInmutablesYSinAccesoPublico() throws Exception {
        var f = aprobado("19.00");
        var v = service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin);
        try (Connection c = connect()) {
            for (String s : List.of("UPDATE certificados_academicos SET codigo='DWI-0000-0000-0000' WHERE id='" + v.id() + "'",
                    "UPDATE certificados_academicos SET estado='PENDIENTE' WHERE id='" + v.id() + "'",
                    "DELETE FROM certificados_academicos WHERE id='" + v.id() + "'",
                    "TRUNCATE certificados_academicos CASCADE",
                    "UPDATE certificados_eventos SET detalle='x' WHERE certificado_id='" + v.id() + "'",
                    "DELETE FROM certificados_eventos WHERE certificado_id='" + v.id() + "'"))
                assertThatThrownBy(() -> sql(c, s)).isInstanceOf(SQLException.class)
                        .satisfies(ex -> assertThat(((SQLException) ex).getSQLState()).isEqualTo("23514"));
            assertThat(value(c, "SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('certificados_academicos'::regclass,'certificados_eventos'::regclass)")).isEqualTo("t");
            for (String rol : List.of("anon", "authenticated"))
                assertThat(value(c, "SELECT bool_or(has_table_privilege('" + rol + "',t,'SELECT,INSERT,UPDATE,DELETE')) FROM unnest(ARRAY['certificados_academicos','certificados_eventos']) t")).isEqualTo("f");
        }
    }

    // ---------------- B1: nunca eliminar el PDF de un certificado EMITIDO ----------------
    /** Validador cuya segunda llamada (fase de confirmacion) falla DESPUES o ANTES del commit. */
    CertificadoService servicioConFalloEnConfirmacion(boolean despuesDelCommit) {
        var validador = new ValidadorEmision(matriculas, aprobaciones, historial, evidencia, jdbc, em, manager) {
            final java.util.concurrent.atomic.AtomicInteger llamadas = new java.util.concurrent.atomic.AtomicInteger();
            @Override public <T> T conAprobacionVigente(UUID c, UUID a, java.util.function.Function<AprobacionVigente, T> f) {
                if (llamadas.incrementAndGet() < 2) return super.conAprobacionVigente(c, a, f);
                if (despuesDelCommit) {
                    super.conAprobacionVigente(c, a, f); // EMITIDO confirmado en la base...
                    throw new org.springframework.dao.DataAccessResourceFailureException("conexion perdida tras el commit");
                }
                throw new org.springframework.dao.DataAccessResourceFailureException("base no disponible antes del commit");
            }
        };
        return new CertificadoService(validador, certificados, eventos, cursos, usuarios, storage, jdbc, manager,
                "http://localhost:4200/verificar-certificado", Clock.systemUTC());
    }

    String objetoDe(UUID certificado) {
        return jdbc.queryForObject("SELECT object_key FROM certificados_academicos WHERE id=?", String.class, certificado);
    }

    @Test
    void falloDespuesDelCommitConservaElPdfEmitido() {
        var f = aprobado("15.00");
        UUID clave = UUID.randomUUID();
        assertThatThrownBy(() -> servicioConFalloEnConfirmacion(true).emitir(f.curso(), f.alumno(), clave, actorAdmin))
                .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);
        // El certificado quedo EMITIDO y su PDF sigue en Storage.
        var emitido = service.emitir(f.curso(), f.alumno(), clave, actorAdmin); // reintento idempotente
        assertThat(emitido.estado()).isEqualTo(Certificado.Estado.EMITIDO);
        assertThat(storage.objetos).containsKey(objetoDe(emitido.id()));
        assertThat(service.eventos(emitido.id())).extracting(CertificadoService.Evento::evento)
                .containsExactly(CertificadoEvento.Tipo.EMISION_INICIADA, CertificadoEvento.Tipo.EMITIDO);
        assertThat(service.descargar(emitido.id(), new AuthPrincipal(f.alumno().toString(), "ESTUDIANTE")).url()).startsWith("https://");
        conflicto(() -> service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin)); // sin duplicados
        assertThat(activos(f)).isEqualTo(1);
    }

    @Test
    void falloAntesDelCommitLimpiaYPermiteReintentar() {
        var f = aprobado("15.00");
        UUID clave = UUID.randomUUID();
        assertThatThrownBy(() -> servicioConFalloEnConfirmacion(false).emitir(f.curso(), f.alumno(), clave, actorAdmin))
                .isInstanceOf(org.springframework.dao.DataAccessResourceFailureException.class);
        var fallido = service.emitir(f.curso(), f.alumno(), clave, actorAdmin); // misma clave: estado real
        assertThat(fallido.estado()).isEqualTo(Certificado.Estado.FALLIDO);
        assertThat(storage.objetos).doesNotContainKey(objetoDe(fallido.id())); // FALLIDO confirmado -> limpiado
        var nuevo = service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin);
        assertThat(nuevo.estado()).isEqualTo(Certificado.Estado.EMITIDO);
        assertThat(storage.objetos).containsKey(objetoDe(nuevo.id()));
        assertThat(activos(f)).isEqualTo(1);
    }

    @Test
    void fallarSoloConfirmaSiLaBaseConfirmaFallido() {
        var f = aprobado("16.00");
        var emitido = service.emitir(f.curso(), f.alumno(), UUID.randomUUID(), actorAdmin);
        // EMITIDO: nunca se confirma FALLIDO (el PDF no debe borrarse).
        assertThat(service.fallar(emitido.id(), f.curso(), admin, "prueba")).isFalse();
        assertThat(certificados.findById(emitido.id()).orElseThrow().getEstado()).isEqualTo(Certificado.Estado.EMITIDO);
        // Resultado incierto (la transaccion falla): no se confirma.
        var g = aprobado("16.00");
        var r = decisiones.actual(g.curso(), g.alumno(), actorDocente).revision();
        UUID pendiente = UUID.randomUUID();
        jdbc.update("INSERT INTO certificados_academicos(id,codigo,curso_id,estudiante_id,aprobacion_id,historial_id,revision_academica,evidencia_hash,"
                + "estudiante_nombre,curso_titulo,emitido_por,idempotencia,fecha_emision,object_key,pdf_sha256,tamano_bytes,estado) "
                + "VALUES (?,?,?,?,?,?,?,?,'Ana','Curso',?,?,now(),?,?,1,'PENDIENTE')",
                pendiente, CertificadoService.nuevoCodigo(), g.curso(), g.alumno(), r.aprobacionId(), r.id(), r.revisionAcademica(),
                r.evidenciaHash(), admin, UUID.randomUUID(), "certificados/" + UUID.randomUUID() + ".pdf", "d".repeat(64));
        assertThat(service.fallar(pendiente, UUID.randomUUID(), admin, "curso inexistente -> error")).isFalse();
        assertThat(certificados.findById(pendiente).orElseThrow().getEstado()).isEqualTo(Certificado.Estado.PENDIENTE);
        // Confirmado: PENDIENTE -> FALLIDO, y repetirlo sigue confirmando (idempotente) sin nuevo evento.
        assertThat(service.fallar(pendiente, g.curso(), admin, "prueba")).isTrue();
        assertThat(service.fallar(pendiente, g.curso(), admin, "prueba")).isTrue();
        assertThat(service.eventos(pendiente)).extracting(CertificadoService.Evento::evento).containsExactly(CertificadoEvento.Tipo.FALLIDO);
    }

    static void conflicto(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(409));
    }
    static void migration(Connection c, String name) throws Exception {
        Path p = Path.of("../database", name);
        if (!Files.exists(p)) p = Path.of("database", name);
        sql(c, Files.readString(p));
    }
    static void sql(Connection c, String sql) throws SQLException { try (var s = c.createStatement()) { s.execute(sql); } }
    static String value(Connection c, String sql) throws SQLException {
        try (var s = c.createStatement(); var r = s.executeQuery(sql)) { r.next(); return r.getString(1); }
    }
}
