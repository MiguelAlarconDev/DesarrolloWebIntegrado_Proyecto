package com.cursos.aula.tareas;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface EntregaArchivoRepository extends JpaRepository<EntregaArchivo,UUID> {
    java.util.Optional<EntregaArchivo> findByEntregaId(UUID entregaId);
    boolean existsByObjectKey(String objectKey);
}
