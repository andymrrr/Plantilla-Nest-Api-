import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Modulo } from './modulo.entity';

@Entity({ name: 'aplicaciones' })
export class Aplicacion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 250, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => Modulo, (modulo) => modulo.aplicacion)
  modulos!: Modulo[];
}
