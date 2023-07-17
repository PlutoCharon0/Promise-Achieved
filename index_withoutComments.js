/**
 * 判断传入值是否为一个 thenable对象 （可以访问 then方法 的对象）
 * @param { * } value 待判断的值
 * @returns { Boolean }
 */
function isThenable(value) {
    return (
        !isEqual(value, null) &&
        (judgmentType(value, "object") || judgmentType(value, "function")) &&
        judgmentType(value.then, "function")
    );
}
/**
 * 判断传入值是否为一个 对象或者函数
 * @param { * } value 待判断的值
 * @returns { Boolean }
 */
function isObjectOrFunction(value) {
    return (
        !isEqual(value, null) &&
        (judgmentType(value, "object") || judgmentType(value, "function"))
    );
}
/**
 * 判断传入值是否为一个 promise对象 实例
 * @param { * } value 待判断的值
 * @returns { Boolean }
 */
function isPromise(value) {
    return value instanceof myPromise;
}
/**
 * 判断传入值和目标值是否相等
 * @param { * } value 待判断的值
 * @param { * } target 目标值
 * @returns { Boolean }
 */
function isEqual(value, target) {
    return value === target;
}
/**
 * 判断传入值和目标类型是否相等
 * @param { * } value 待判断的值
 * @param { * } type 目标类型
 * @param { Boolean } negation 是否取反判断
 * @returns { Boolean }
 */
function judgmentType(value, type, negation = false) {
    if (negation) {
        return typeof value !== type;
    }
    return typeof value === type;
}
/**
 * 根据 onFulfilled/onRejected 函数执行的返回值，对 .then方法返回的promise对象 作出相应的状态改变操作
 * @param { myPromise } promiseForReturn .then方法返回的 promise对象
 * @param { * } handledResult  onFulfilled/onRejected 函数执行的返回值
 * @param { Function } resolve 修改 .then方法返回的 promise对象 状态为 fulfilled 的方法
 * @param { Function } reject  修改 .then方法返回的 promise对象 状态为 rejected 的方法
 */
function resolvePromise(promiseForReturn, handledResult, resolve, reject) {
    let customThenFn;

    if (isEqual(handledResult, promiseForReturn)) {
        throw new TypeError("Chaining cycle detected for promise");
    } else if (isPromise(handledResult)) {
        handledResult.then(
            (result) =>
                resolvePromise(promiseForReturn, result, resolve, reject),
            (reason) => reject(reason)
        );
    } else if (isObjectOrFunction(handledResult)) {
        try {
            customThenFn = handledResult.then;
        } catch (error) {
            return reject(error);
        }
        if (judgmentType(customThenFn, "function")) {
            let called = false;
            try {
                customThenFn.call(
                    handledResult,
                    (result) => {
                        if (called) return;
                        called = true;

                        resolvePromise(
                            promiseForReturn,
                            result,
                            resolve,
                            reject
                        );
                    },
                    (reason) => {
                        if (called) return;
                        called = true;

                        reject(reason);
                    }
                );
            } catch (error) {
                if (called) return;
                called = true;
                reject(error);
            }
        } else {
            resolve(handledResult);
        }
    } else {
        resolve(handledResult);
    }
}

class myPromise {
    static PENDING = "pending";
    static FULFILLED = "fulfilled";
    static REJECTED = "rejected";
    constructor(excutor) {
        this.PromiseState = myPromise.PENDING;
        this.PromiseResult = undefined;
        this.handleFulfilledCb = [];
        this.handleRejectedCb = [];
        try {
            excutor(this.resolve.bind(this), this.reject.bind(this));
        } catch (error) {
            this.reject(error);
        }
    }
    /**
     * 用于修改promise状态 为 fulfilled（已兑现状态）
     * @param { * } result promise对象的结果值（PromiseResult）
     */
    resolve(result) {
        if (!isEqual(this.PromiseState, myPromise.PENDING)) return;
        this.PromiseState = myPromise.FULFILLED;
        this.PromiseResult = result;
        this.handleFulfilledCb.forEach((cb) => cb());
    }
    /**
     * 用于修改promise状态 为 rejected（已拒绝状态）
     * @param { * } reason promise对象的结果值（PromiseResult）
     */
    reject(reason) {
        if (!isEqual(this.PromiseState, myPromise.PENDING)) return;
        this.PromiseState = myPromise.REJECTED;
        this.PromiseResult = reason;
        this.handleRejectedCb.forEach((cb) => cb());
    }
    /**
     * 根据 this 指向的promise调用对象的 状态 处理传入的对应回调
     * @param { Function } onFulfilled promise调用对象状态为 fulfilled时 所调用的相应回调函数
     * @param { Function } onRejected promise调用对象状态为 rejected 所调用的相应回调函数
     * @returns { myPromise } 返回一个新的promise对象
     */
    then(onFulfilled, onRejected) {
        let promiseForReturn = new myPromise((resolve, reject) => {
            switch (this.PromiseState) {
                case myPromise.FULFILLED:
                    queueMicrotask(() => {
                        try {
                            if (judgmentType(onFulfilled, "function", true)) {
                                resolve(this.PromiseResult);
                            } else {
                                resolvePromise(
                                    promiseForReturn,
                                    onFulfilled(this.PromiseResult),
                                    resolve,
                                    reject
                                );
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                    break;
                case myPromise.REJECTED:
                    queueMicrotask(() => {
                        try {
                            if (judgmentType(onRejected, "function", true)) {
                                reject(this.PromiseResult);
                            } else {
                                resolvePromise(
                                    promiseForReturn,
                                    onRejected(this.PromiseResult),
                                    resolve,
                                    reject
                                );
                            }
                        } catch (error) {
                            reject(error);
                        }
                    });
                    break;
                case myPromise.PENDING:
                    this.handleFulfilledCb.push(() => {
                        queueMicrotask(() => {
                            try {
                                if (
                                    judgmentType(onFulfilled, "function", true)
                                ) {
                                    resolve(this.PromiseResult);
                                } else {
                                    resolvePromise(
                                        promiseForReturn,
                                        onFulfilled(this.PromiseResult),
                                        resolve,
                                        reject
                                    );
                                }
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });

                    this.handleRejectedCb.push(() => {
                        queueMicrotask(() => {
                            try {
                                if (
                                    judgmentType(onRejected, "function", true)
                                ) {
                                    reject(this.PromiseResult);
                                } else {
                                    resolvePromise(
                                        promiseForReturn,
                                        onRejected(this.PromiseResult),
                                        resolve,
                                        reject
                                    );
                                }
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });
                    break;
            }
        });

        return promiseForReturn;
    }
    /**
     * .then(undefined, onRejected) 的语法糖
     * @param { Function } onRejected promise调用对象状态为 rejected 所调用的相应回调函数
     * @returns { myPromise }
     */
    catch(onRejected) {
        return this.then(undefined, onRejected);
    }
    /**
     * 无论调用对象处于何种状态，始终调用参数回调
     * @param { Function } onFinally
     * @returns { myPromise }
     */
    finally(onFinally) {
        let p = this.constructor;

        return this.then(
            (result) => p.resolve(onFinally()).then(() => result),
            (reason) =>
                p.resolve(onFinally()).then(() => {
                    throw reason;
                })
        );
    }
    /**
     * 根据参数类型，返回对应状态的Promise对象
     * @param { * } value 生成的Pormise对象结果值/返回的Promise对象
     * @returns { myPromise }
     */
    static resolve(value) {
        if (isPromise(value)) return value;
        if (isThenable(value)) {
            return new myPromise((resolve, reject) => {
                value.then(resolve, reject);
            });
        }

        return new myPromise((resolve) => {
            resolve(value);
        });
    }
    /**
     * 返回一个以参数为拒因的rejected状态的Promise对象
     * @param { * } value 拒因
     * @returns { myPromise }
     */
    static reject(value) {
        return new myPromise((resolve, reject) => {
            reject(value);
        });
    }
    /**
     * 根据可迭代对象中迭代值的状态，决定待返Pormise对象的状态 (all fulfilled ---> fulfilled ) / (one rejected ---> rejected)
     * @param { iterable } promises 可迭代对象
     * @returns { myPromise }
     */
    static all(promises) {
        return new myPromise((resolve, reject) => {
            try {
                const length = [...promises].length;
                const resultList = [];

                if (isEqual(length, 0)) return resolve(resultList);
                let count = 0;
                for (const promiseItem of promises) {
                    myPromise.resolve(promiseItem).then(
                        (result) => {
                            resultList[count++] = result;

                            isEqual(count, length) && resolve(resultList);
                        },
                        (reason) => {
                            reject(reason);
                        }
                    );
                }
            } catch (error) {
                reject(new TypeError("Argument is not iterable"));
            }
        });
    }
    /**
     * 返回一个fulfilled状态对象 结果值为一个个由 { status: '迭代值状态', value: '迭代值结果值' }结构组成的数组
     * @param { iterable } promises 可迭代对象
     * @returns { myPromise }
     */
    static allSettled(promises) {
        return new myPromise((resolve, reject) => {
            try {
                const length = [...promises].length;
                const resultList = [];
                if (isEqual(length, 0)) return resolve(resultList);
                let count = 0;
                for (const promiseItem of promises) {
                    myPromise.resolve(promiseItem).then(
                        (result) => {
                            resultList[count++] = {
                                status: myPromise.FULFILLED,
                                value: result,
                            };

                            isEqual(count, length) && resolve(resultList);
                        },
                        (reason) => {
                            resultList[count++] = {
                                status: myPromise.REJECTED,
                                value: reason,
                            };

                            isEqual(count, length) && resolve(resultList);
                        }
                    );
                }
            } catch (error) {
                reject(new TypeError("Argument is not iterable"));
            }
        });
    }
    /**
     * 根据可迭代对象中迭代值的状态，决定待返Pormise对象的状态 (one fulfilled ---> fulfilled ) / (all rejected ---> rejected)
     * @param { iterable } promises 可迭代对象
     * @returns { myPromise }
     */
    static any(promises) {
        return new myPromise((resolve, reject) => {
            try {
                const length = [...promises].length;
                const reasonList = [];

                if (isEqual(length, 0))
                    return reject(
                        new AggregateError(
                            reasonList,
                            "All promises were rejected"
                        )
                    );
                let count = 0;
                for (const promiseItem of promises) {
                    myPromise.resolve(promiseItem).then(
                        (result) => {
                            resolve(result);
                        },
                        (reason) => {
                            resultList[count++] = reason;

                            isEqual(count, length) &&
                                reject(
                                    new AggregateError(
                                        reasonList,
                                        "All promises were rejected"
                                    )
                                );
                        }
                    );
                }
            } catch (error) {
                reject(
                    new AggregateError(resultList, "All promises were rejected")
                );
            }
        });
    }
    /**
     * 返回一个状态由迭代值中第一个状态敲定的对象决定的Pormise对象
     * @param { iterable } promises 可迭代对象
     * @returns { myPromise }
     */
    static race(promises) {
        return new myPromise((resolve, reject) => {
            try {
                const length = [...promises].length;
                if (!isEqual(length, 0)) {
                    for (const promiseItem of promises) {
                        myPromise.resolve(promiseItem).then(resolve, reject);
                    }
                }
            } catch (error) {
                reject(new TypeError("Argument is not iterable"));
            }
        });
    }
}

myPromise.deferred = function () {
    let result = {};
    result.promise = new myPromise((resolve, reject) => {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
};

module.exports = myPromise;
