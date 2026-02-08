export class CreateProductDto {
  name!: string;
  category!: string;
  price!: number;
  stock?: number;
  stockCritical?: number;
  isActive?: boolean;
}

export class UpdateProductDto {
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
  stockCritical?: number;
  isActive?: boolean;
}