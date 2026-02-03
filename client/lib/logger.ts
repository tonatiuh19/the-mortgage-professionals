class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment =
      import.meta.env.DEV || process.env.NODE_ENV === "development";
  }

  log(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  error(...args: any[]): void {
    if (this.isDevelopment) {
      console.error(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  table(data: any): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }
}

export const logger = new Logger();
