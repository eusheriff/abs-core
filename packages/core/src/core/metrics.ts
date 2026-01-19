export class Metrics {
    private static metrics: Record<string, number[]> = {};

    static record(name: string, value: number) {
        if (!this.metrics[name]) {
            this.metrics[name] = [];
        }
        this.metrics[name].push(value);
        // Clean up old metrics to prevent memory leak in long running process
        if (this.metrics[name].length > 1000) {
            this.metrics[name].shift();
        }
    }

    static getAverage(name: string): number {
        const values = this.metrics[name];
        if (!values || values.length === 0) return 0;
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }

    static snapshot(): Record<string, number> {
        const result: Record<string, number> = {};
        for (const key in this.metrics) {
            result[key] = this.getAverage(key);
        }
        return result;
    }
}
