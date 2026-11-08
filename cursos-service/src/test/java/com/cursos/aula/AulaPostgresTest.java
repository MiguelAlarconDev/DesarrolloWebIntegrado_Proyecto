package com.cursos.aula;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;

/** Explicit opt-in; fixed loopback endpoint and cluster marker prevent use against Supabase.
 * Requires an EMPTY disposable aula_validation DB. Never reads application DB credentials.
 */
@EnabledIfSystemProperty(named = "aula.postgres.test", matches = "true")
class AulaPostgresTest {
    private static final String URL = "jdbc:postgresql://127.0.0.1:55439/aula_validation";
    private static final String USER = "aula_test";
    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID COURSE_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Test void migrationConstraintsJpaAndExistingData() throws Exception {
        try (Connection db = DriverManager.getConnection(URL, USER, "")) {
            assertThat(value(db, "SHOW cluster_name")).isEqualTo("aula-isolated-validation");
            assertThat(value(db, "SELECT current_database()")).isEqualTo("aula_validation");
            assertThat(value(db, "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"))
                    .isEqualTo("0");
            // Minimal referenced schema plus sentinel data, only in the disposable database.
            execute(db, "CREATE TABLE public.usuarios(id uuid PRIMARY KEY, marcador text NOT NULL)");
            execute(db, "CREATE TABLE public.cursos(id uuid PRIMARY KEY, docente_id uuid REFERENCES public.usuarios(id), marcador text NOT NULL)");
            execute(db, "CREATE TABLE public.pedidos(id uuid PRIMARY KEY, curso_id uuid REFERENCES public.cursos(id), estado varchar(20), marcador text NOT NULL)");
            execute(db, "INSERT INTO public.usuarios VALUES ('" + USER_ID + "','TEST_ONLY_USER')");
            execute(db, "INSERT INTO public.cursos VALUES ('" + COURSE_ID + "','" + USER_ID + "','TEST_ONLY_COURSE')");
            execute(db, "INSERT INTO public.pedidos VALUES ('00000000-0000-0000-0000-000000000003','" + COURSE_ID + "','PAGADO','TEST_ONLY_ORDER')");
            execute(db, "CREATE ROLE anon NOLOGIN");
            execute(db, "CREATE ROLE authenticated NOLOGIN");
            String before = existingSnapshot(db);
            Path migration = Path.of("../database/migracion_aula_virtual_fase_a.sql");
            if (!Files.exists(migration)) migration = Path.of("database/migracion_aula_virtual_fase_a.sql");
            execute(db, Files.readString(migration));
            assertThat(existingSnapshot(db)).isEqualTo(before);

            assertThat(columns(db, "curso_modulos")).containsExactly(
                    "id:uuid:NO", "curso_id:uuid:NO", "titulo:character varying(150):NO", "orden:integer:NO");
            assertThat(columns(db, "curso_materiales")).containsExactly(
                    "id:uuid:NO", "modulo_id:uuid:NO", "titulo:character varying(200):NO", "object_key:character varying(500):NO",
                    "nombre_original:character varying(255):NO", "mime_type:character varying(100):NO", "tamano_bytes:bigint:NO",
                    "tipo:character varying(10):NO", "estado:character varying(30):NO", "creado_por:uuid:NO",
                    "created_at:timestamp with time zone:NO");
            assertThat(value(db, "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename IN ('curso_modulos','curso_materiales')"))
                    .isEqualTo("5");
            assertThat(value(db, "SELECT count(*) FROM pg_constraint WHERE conrelid IN ('public.curso_modulos'::regclass,'public.curso_materiales'::regclass) AND contype='f' AND confdeltype='r'"))
                    .isEqualTo("3");
            assertThat(value(db, "SELECT count(*) FROM pg_constraint WHERE conrelid IN ('public.curso_modulos'::regclass,'public.curso_materiales'::regclass) AND contype='c'"))
                    .isEqualTo("9");
            assertThat(value(db, "SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN ('public.curso_modulos'::regclass,'public.curso_materiales'::regclass)"))
                    .isEqualTo("t");
            assertThat(value(db, "SELECT has_table_privilege('anon','public.curso_materiales','SELECT') OR has_table_privilege('authenticated','public.curso_materiales','SELECT')"))
                    .isEqualTo("f");

            String schemaBeforeJpa = aulaSchema(db);
            var ds = new DriverManagerDataSource(URL, USER, "");
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(ds);
            // Phase A remains independently testable before the optional E.2 migration.
            factory.setManagedTypes(org.springframework.orm.jpa.persistenceunit.PersistenceManagedTypes.of(
                    Modulo.class.getName(), Material.class.getName()));
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.show_sql", "false"));
            factory.afterPropertiesSet(); // Fails if either real entity is incompatible with PostgreSQL DDL.
            UUID moduloId;
            UUID materialId;
            try (var em = Objects.requireNonNull(factory.getObject()).createEntityManager()) {
                em.getTransaction().begin();
                Modulo modulo = new Modulo(COURSE_ID, "Semana de prueba", 1);
                em.persist(modulo); em.flush(); moduloId = modulo.getId();
                Material material = new Material();
                ReflectionTestUtils.setField(material, "moduloId", moduloId);
                ReflectionTestUtils.setField(material, "titulo", "Documento de prueba");
                ReflectionTestUtils.setField(material, "objectKey", "TEST_ONLY/material.pdf");
                ReflectionTestUtils.setField(material, "nombreOriginal", "material.pdf");
                ReflectionTestUtils.setField(material, "mimeType", "application/pdf");
                ReflectionTestUtils.setField(material, "tamanoBytes", 10485760L);
                ReflectionTestUtils.setField(material, "tipo", Material.Tipo.PDF);
                ReflectionTestUtils.setField(material, "estado", Material.Estado.ACTIVO);
                ReflectionTestUtils.setField(material, "creadoPor", USER_ID);
                Instant created = Instant.parse("2026-01-01T12:34:56Z");
                ReflectionTestUtils.setField(material, "createdAt", created);
                em.persist(material); em.flush(); materialId = material.getId();
                em.getTransaction().commit(); em.clear();
                var repositories = new JpaRepositoryFactory(em);
                assertThat(repositories.getRepository(ModuloRepository.class).findByCursoIdOrderByOrdenAscIdAsc(COURSE_ID))
                        .extracting(Modulo::getId).containsExactly(moduloId);
                assertThat(repositories.getRepository(ModuloRepository.class).findByIdAndCursoId(moduloId, UUID.randomUUID())).isEmpty();
                var materials = repositories.getRepository(MaterialRepository.class);
                assertThat(materials.findByModuloIdInAndEstadoOrderByCreatedAtAscIdAsc(List.of(moduloId), Material.Estado.ACTIVO))
                        .extracting(Material::getId).containsExactly(materialId);
                assertThat(materials.findByModuloIdInAndEstadoOrderByCreatedAtAscIdAsc(List.of(moduloId), Material.Estado.PENDIENTE)).isEmpty();
                assertThat(ReflectionTestUtils.getField(em.find(Material.class, materialId), "createdAt")).isEqualTo(created);
            } finally { factory.destroy(); }
            assertThat(aulaSchema(db)).isEqualTo(schemaBeforeJpa);
            String target = " WHERE id='" + materialId + "'";
            for (String change : List.of("tamano_bytes=0", "tamano_bytes=10485761", "tipo='EXE'", "estado='PUBLICO'",
                    "mime_type='text/html'", "titulo=' '", "object_key=''", "nombre_original=''")) {
                rejected(db, "UPDATE public.curso_materiales SET " + change + target, "23514");
            }
            rejected(db, "UPDATE public.curso_materiales SET titulo=NULL" + target, "23502");
            rejected(db, "UPDATE public.curso_materiales SET modulo_id='" + UUID.randomUUID() + "'" + target, "23503");
            rejected(db, "UPDATE public.curso_materiales SET creado_por='" + UUID.randomUUID() + "'" + target, "23503");
            rejected(db, "UPDATE public.curso_modulos SET curso_id='" + UUID.randomUUID() + "'", "23503");
            rejected(db, "UPDATE public.curso_modulos SET orden=0", "23514");
            rejected(db, "UPDATE public.curso_modulos SET titulo=' '", "23514");
            rejected(db, "DELETE FROM public.curso_modulos WHERE id='" + moduloId + "'", "23001");
            rejected(db, "INSERT INTO public.curso_materiales SELECT gen_random_uuid(),modulo_id,titulo,object_key,nombre_original,mime_type,tamano_bytes,tipo,estado,creado_por,created_at FROM public.curso_materiales", "23505");
            for (String[] format : new String[][]{{"DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
                    {"PPTX", "application/vnd.openxmlformats-officedocument.presentationml.presentation"}, {"ZIP", "application/zip"}}) {
                execute(db, "UPDATE public.curso_materiales SET tipo='" + format[0] + "',mime_type='" + format[1] + "'" + target);
            }
            // Even with SELECT temporarily granted, RLS without policies returns no rows.
            execute(db, "GRANT SELECT ON public.curso_modulos, public.curso_materiales TO anon, authenticated");
            for (String role : List.of("anon", "authenticated")) {
                execute(db, "SET ROLE " + role);
                assertThat(value(db, "SELECT count(*) FROM public.curso_materiales")).isEqualTo("0");
                assertThat(value(db, "SELECT count(*) FROM public.curso_modulos")).isEqualTo("0");
                execute(db, "RESET ROLE");
            }
            execute(db, "REVOKE ALL ON public.curso_modulos, public.curso_materiales FROM anon, authenticated");
            assertThat(existingSnapshot(db)).isEqualTo(before);
            System.out.println("AULA POSTGRES: migration, 15 columns, 5 indexes, 3 FKs, 9 CHECKs, RLS, Hibernate validate, repositories and existing-data invariance OK");
        }
    }

    private static List<String> columns(Connection db, String table) throws SQLException {
        List<String> result = new ArrayList<>();
        try (var s = db.createStatement(); var r = s.executeQuery("SELECT column_name || ':' || data_type || CASE WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')' ELSE '' END || ':' || is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='" + table + "' ORDER BY ordinal_position")) {
            while (r.next()) result.add(r.getString(1));
        }
        return result;
    }
    private static String existingSnapshot(Connection db) throws SQLException {
        StringBuilder snapshot = new StringBuilder();
        for (String table : List.of("usuarios", "cursos", "pedidos")) {
            snapshot.append(columns(db, table));
            snapshot.append(value(db, "SELECT json_agg(t ORDER BY id)::text FROM public." + table + " t"));
            snapshot.append(value(db, "SELECT string_agg(pg_get_constraintdef(oid),';' ORDER BY conname) FROM pg_constraint WHERE conrelid='public." + table + "'::regclass"));
            snapshot.append(value(db, "SELECT string_agg(indexdef,';' ORDER BY indexname) FROM pg_indexes WHERE schemaname='public' AND tablename='" + table + "'"));
        }
        return snapshot.toString();
    }
    private static String aulaSchema(Connection db) throws SQLException {
        return columns(db, "curso_modulos").toString() + columns(db, "curso_materiales")
                + value(db, "SELECT string_agg(pg_get_constraintdef(oid),';' ORDER BY conname) FROM pg_constraint WHERE conrelid IN ('public.curso_modulos'::regclass,'public.curso_materiales'::regclass)")
                + value(db, "SELECT string_agg(indexdef,';' ORDER BY indexname) FROM pg_indexes WHERE tablename IN ('curso_modulos','curso_materiales') AND schemaname='public'");
    }
    private static void rejected(Connection db, String sql, String sqlState) {
        assertThatThrownBy(() -> execute(db, sql)).isInstanceOf(SQLException.class)
                .satisfies(ex -> assertThat(((SQLException) ex).getSQLState()).isEqualTo(sqlState));
    }
    private static void execute(Connection db, String sql) throws SQLException {
        try (var statement = db.createStatement()) { statement.execute(sql); }
    }
    private static String value(Connection db, String sql) throws SQLException {
        try (var statement = db.createStatement(); var result = statement.executeQuery(sql)) {
            result.next(); return result.getString(1);
        }
    }
}
