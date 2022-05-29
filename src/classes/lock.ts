import {createReadWriteLock} from "locks";

export class Lock {
    readonly #lock: {
        isLocked: boolean | 'W' | 'R';
        [k: string]: any;
    };

    get lock(): any {
        return this.#lock;
    }

    constructor() {
        this.#lock = createReadWriteLock();
    }

    async readLock<T>(fn: () => Promise<T>) {
        return new Promise<T>((resolve, reject) => {
            this.#lock.readLock(() => {
                // console.log('Read Lock', lock.isLocked);
                fn()
                    .then((res) => resolve(res))
                    .catch(reject)
                    .finally(() => this.#lock.unlock())
            });
        });
    }

    async writeLock<T>(fn: () => Promise<T>) {
        return new Promise<T>((resolve, reject) => {
            this.#lock.writeLock(() => {
                // console.log('Write Lock', lock.isLocked);
                fn()
                    .then((res) => resolve(res))
                    .catch(reject)
                    .finally(() => this.#lock.unlock())
            });
        });
    }
}
