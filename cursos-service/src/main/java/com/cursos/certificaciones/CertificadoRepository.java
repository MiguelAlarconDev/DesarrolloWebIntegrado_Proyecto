package com.cursos.certificaciones;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

/** Sin API de borrado en uso: PostgreSQL rechaza DELETE/TRUNCATE y transiciones invalidas. */
public interface CertificadoRepository extends JpaRepository<Certificado,UUID> {
    Optional<Certificado> findByEmitidoPorAndIdempotencia(UUID emisor,UUID clave);
    Optional<Certificado> findByCodigo(String codigo);
    @Query("select c from Certificado c where c.cursoId=:curso and c.estudianteId=:estudiante and c.estado in ('PENDIENTE','EMITIDO')")
    Optional<Certificado> activo(@Param("curso") UUID curso,@Param("estudiante") UUID estudiante);
    List<Certificado> findByEstudianteIdAndEstadoOrderByFechaEmisionDescIdAsc(UUID estudiante,Certificado.Estado estado);
    Page<Certificado> findAllByOrderByCreatedAtDescIdAsc(Pageable pageable);
}
