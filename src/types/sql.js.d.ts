declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }
  interface Database {
    exec(sql: string): QueryExecResult[];
    close(): void;
  }
  interface QueryExecResult {
    columns: string[];
    values: (string | number | null | Uint8Array)[][];
  }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
