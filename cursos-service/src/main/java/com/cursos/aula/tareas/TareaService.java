package com.cursos.aula.tareas;
import com.cursos.aula.AulaService;
import com.cursos.security.AuthPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@Service
public class TareaService {
    private final AulaService aula;
    private final TareaRepository tareas;
    private final EntregaRepository entregas;
    public TareaService(AulaService aula,TareaRepository tareas,EntregaRepository entregas) {
        this.aula=aula; this.tareas=tareas; this.entregas=entregas;
    }
    public List<Vista> listar(UUID curso,UUID modulo,AuthPrincipal p) {
        aula.autorizarModulo(curso,modulo,p,false);
        return tareas.findByModuloIdOrderByCreatedAtAscIdAsc(modulo).stream().map(Vista::of).toList();
    }
    public Vista detalle(UUID curso,UUID modulo,UUID id,AuthPrincipal p) {
        aula.autorizarModulo(curso,modulo,p,false);
        return Vista.of(tareas.findByIdAndModuloId(id,modulo).orElseThrow(TareaService::noEncontrada));
    }
    @Transactional
    public Vista crear(UUID curso,UUID modulo,TareaController.Crear body,AuthPrincipal p) {
        aula.autorizarModulo(curso,modulo,p,true);
        return Vista.of(tareas.saveAndFlush(new Tarea(modulo,body.titulo(),body.consigna(),body.fechaLimite(),body.tipoEntrega(),UUID.fromString(p.subject()))));
    }
    @Transactional
    public Vista editar(UUID curso,UUID modulo,UUID id,TareaController.Editar body,AuthPrincipal p) {
        aula.autorizarModulo(curso,modulo,p,true);
        Tarea tarea=editable(id,modulo,body.version());
        tarea.editar(body.titulo(),body.consigna(),body.fechaLimite(),body.tipoEntrega());
        return Vista.of(tareas.saveAndFlush(tarea));
    }
    @Transactional
    public void eliminar(UUID curso,UUID modulo,UUID id,long version,AuthPrincipal p) {
        aula.autorizarModulo(curso,modulo,p,true);
        tareas.delete(editable(id,modulo,version));
        tareas.flush();
    }
    private Tarea editable(UUID id,UUID modulo,long version) {
        Tarea tarea=tareas.bloquear(id,modulo).orElseThrow(TareaService::noEncontrada);
        if(tarea.getVersion()!=version) throw new ResponseStatusException(HttpStatus.CONFLICT,"La tarea cambio; recargue antes de continuar");
        if(entregas.existsByTareaId(id)) throw new ResponseStatusException(HttpStatus.CONFLICT,"No se puede editar ni eliminar una tarea con entregas");
        return tarea;
    }
    private static ResponseStatusException noEncontrada(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Tarea no encontrada");}
    public record Vista(UUID id,UUID moduloId,String titulo,String consigna,Instant fechaLimite,Tarea.TipoEntrega tipoEntrega,long version) {
        static Vista of(Tarea t){return new Vista(t.getId(),t.getModuloId(),t.getTitulo(),t.getConsigna(),t.getFechaLimite(),t.getTipoEntrega(),t.getVersion());}
    }
}
