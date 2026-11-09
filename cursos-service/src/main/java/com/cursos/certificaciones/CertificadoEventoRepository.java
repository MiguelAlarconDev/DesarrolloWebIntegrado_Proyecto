package com.cursos.certificaciones;

import org.springframework.data.repository.Repository;
import java.util.*;

/** Solo insercion y lectura: el historial es inmutable. */
public interface CertificadoEventoRepository extends Repository<CertificadoEvento,UUID> {
    CertificadoEvento save(CertificadoEvento evento);
    List<CertificadoEvento> findByCertificadoIdOrderByFechaAscIdAsc(UUID certificado);
}
