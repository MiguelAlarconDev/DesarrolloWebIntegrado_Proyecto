package com.cursos.certificaciones;
import com.cursos.aula.tareas.Entrega;
import com.cursos.aula.tareas.TareaRepository.EvaluacionAcademica;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

class MotorRecomendacionTest {
    static final UUID CURSO=UUID.randomUUID(), ALUMNO=UUID.randomUUID();
    record Dato(UUID tareaId, Entrega.Estado estado, BigDecimal nota, boolean confirmada) implements EvaluacionAcademica {
        public UUID getTareaId(){return tareaId;}
        public Entrega.Estado getEstado(){return estado;}
        public BigDecimal getNota(){return nota;}
        public boolean getConfirmada(){return confirmada;}
    }
    static EvaluacionAcademica nota(String n){return new Dato(UUID.randomUUID(),Entrega.Estado.CALIFICADA,new BigDecimal(n),true);}
    static MotorRecomendacion.Resultado calcular(EvaluacionAcademica... datos){return MotorRecomendacion.calcular(CURSO,ALUMNO,List.of(datos));}
    @Test void promediosYUmbralExacto(){
        assertThat(calcular(nota("14"),nota("12"),nota("16")).promedio()).isEqualByComparingTo("14.00");
        assertThat(calcular(nota("14"),nota("12"),nota("16")).recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.APTO);
        assertThat(calcular(nota("10"),nota("10"),nota("12")).recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.NO_APTO);
        assertThat(calcular(nota("10"),nota("12")).recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.APTO);
    }
    @Test void noRedondeaAntesDeComparar(){
        var r=calcular(nota("11"),nota("11"),nota("10.99"));
        assertThat(r.promedio()).isEqualByComparingTo("11.00");
        assertThat(r.recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.NO_APTO);
    }
    @Test void sinTareas(){assertThat(calcular().recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.SIN_DATOS_SUFICIENTES);}
    @Test void proyeccionConvierteEstadoSqlYConservaDecimales(){
        var factory = new org.springframework.data.projection.SpelAwareProxyProjectionFactory();
        var row = factory.createProjection(EvaluacionAcademica.class, Map.of(
            "tareaId", UUID.randomUUID(), "estado", "CALIFICADA", "nota", new BigDecimal("11.00"), "confirmada", true));
        assertThat(row.getEstado()).isEqualTo(Entrega.Estado.CALIFICADA);
        assertThat(calcular(row).recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.APTO);
        var missing = factory.createProjection(EvaluacionAcademica.class, Map.of("tareaId", UUID.randomUUID(), "confirmada", false));
        assertThat(calcular(missing).promedio()).isNull();
    }
    @Test void ausentesPendientesEInvalidasNoSePromedian(){
        var faltantes=List.of(new Dato(UUID.randomUUID(),null,null,false),
            new Dato(UUID.randomUUID(),Entrega.Estado.ENVIO_PENDIENTE,null,false),
            new Dato(UUID.randomUUID(),Entrega.Estado.ENTREGADA,null,true),
            new Dato(UUID.randomUUID(),Entrega.Estado.CALIFICADA,null,true),
            new Dato(UUID.randomUUID(),Entrega.Estado.CALIFICADA,new BigDecimal("20.01"),true),
            new Dato(UUID.randomUUID(),Entrega.Estado.CALIFICADA,new BigDecimal("-1"),true),
            new Dato(UUID.randomUUID(),Entrega.Estado.CALIFICADA,new BigDecimal("11.001"),true),
            new Dato(UUID.randomUUID(),Entrega.Estado.CALIFICADA,new BigDecimal("15"),false));
        for(var f:faltantes){
            var r=calcular(nota("20"),f);
            assertThat(r.promedio()).isNull(); assertThat(r.tareasPendientes()).isEqualTo(1);
            assertThat(r.tareasCalificadas()).isEqualTo(1);
            assertThat(r.recomendacion()).isEqualTo(MotorRecomendacion.Recomendacion.SIN_DATOS_SUFICIENTES);
        }
    }
    @Test void concurrenteSinEstadoCompartido() throws Exception {
        var pool=Executors.newFixedThreadPool(4);
        try {
            List<Callable<MotorRecomendacion.Resultado>> calls=new ArrayList<>();
            for(int i=0;i<40;i++) { final int n=i%21; calls.add(()->calcular(nota(Integer.toString(n)))); }
            var results=pool.invokeAll(calls);
            for(int i=0;i<results.size();i++) assertThat(results.get(i).get().promedio()).isEqualByComparingTo(Integer.toString(i%21));
        } finally {pool.shutdownNow();}
    }
}
