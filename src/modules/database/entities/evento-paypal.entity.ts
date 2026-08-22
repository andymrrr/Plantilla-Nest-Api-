import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoEventoPaypal } from './estado-evento-paypal.enum';

@Entity({ name: 'eventos_paypal' })
export class EventoPaypal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'evento_id_paypal', type: 'varchar', length: 200, unique: true })
  eventoIdPaypal!: string;

  @Column({ name: 'tipo_evento', type: 'varchar', length: 150 })
  tipoEvento!: string;

  @Column({ name: 'fecha_evento', type: 'timestamptz' })
  fechaEvento!: Date;

  @Column({ name: 'contenido', type: 'jsonb' })
  contenido!: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  procesado!: boolean;

  @Column({ name: 'fecha_procesamiento', type: 'timestamptz', nullable: true })
  fechaProcesamiento!: Date | null;

  @Column({
    type: 'enum',
    enum: EstadoEventoPaypal,
    enumName: 'estado_evento_paypal_enum',
    default: EstadoEventoPaypal.RECIBIDO,
  })
  estado!: EstadoEventoPaypal;

  @Column({ name: 'mensaje_error', type: 'text', nullable: true })
  mensajeError!: string | null;

  @Column({ name: 'id_transmision', type: 'varchar', length: 128, nullable: true })
  idTransmision!: string | null;
}
