
declare interface FactoryOptions<T> {
  inject?: any[];
  imports?: any[];
  useFactory: (...args: any[]) => Promise<T> | T;
}
