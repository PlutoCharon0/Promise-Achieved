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
    let customThenFn; // 存储自定义的then方法（属性）
    // 2.3.1 如果 onFulfilled/onRejected 函数执行的返回值 指向 .then方法返回的promise对象 抛出对应报错
    if (isEqual(handledResult, promiseForReturn)) {
        throw new TypeError("Chaining cycle detected for promise");
    } else if (isPromise(handledResult)) {
        // 2.3.2 如果 onFulfilled/onRejected 函数执行的返回值 是一个promise对象 ，根据这个promise对象的状态 执行相应的状态改变变更操作
        // 2.3.2.1 如果该 promise对象（handleResult）处于pending状态，在其状态改变之前 .then方法返回的promise对象始终保持 pending 状态
        // 2.3.2.2 当该 promise对象（handleResult）的状态变更为 fulfilled 时，让 .then方法返回的promise对象 "继承"对应的状态和结果值
        // 2.3.2.3 当该 promise对象（handleResult）的状态变更为 rejected 时，让 .then方法返回的promise对象 "继承"对应的状态和结果值（拒因）
        // 显式的调用 .then方法 完成对应处理
        handledResult.then(
            (result) =>
                resolvePromise(promiseForReturn, result, resolve, reject),
            (reason) => reject(reason)
        );
    } else if (isObjectOrFunction(handledResult)) {
        // 2.3.3 如果返回值是一个对象或者函数
        try {
            // 2.3.3.1 获取返回值的 then 属性
            customThenFn = handledResult.then;
        } catch (error) {
            // 2.3.3.2 如果获取 then 属性时， 抛出报错 直接修改 .then方法返回的promise对象为rejected 结果值为对应报错信息
            // 捕获 获取 then 属性时 抛出的报错 修改 .then方法返回的promise对象为rejected 结果值为对应报错信息
            return reject(error);
        }
        if (judgmentType(customThenFn, 'function')) {
            // 2.3.3.3 如果 then属性 是一个函数 就将返回值作为该自定义then函数的 this指向，第一个参数是 类resolve()方法，第二个参数是 类rejecte()方法 传入对应参数 并执行
            // 2.3.3.3.3 如果 类resolve()方法 和 类reject()方法同时被调用 或者 任意一个被多次调用，则第一次调用优先，任何进一步的调用都将被忽略
            let called = false; // 避免多次调用 优先采用首次调用并忽略剩下的调用
            try {
                customThenFn.call(
                    handledResult,
                    (result) => {
                        if (called) return; // 如果已经被调用过 直接返回 不作后续处理
                        called = true; // 表示已调用
                        // 2.3.3.3.1 如果 类resolve()方法的执行存在返回值，就根据返回值在作出相应处理
                        // 显式地调用resolvepromise() 处理 类resolve方法执行的返回值
                        resolvePromise(
                            promiseForReturn,
                            result,
                            resolve,
                            reject
                        );
                    },
                    (reason) => {
                        if (called) return; // 如果已经被调用过 直接返回 不作后续处理
                        called = true; // 表示已调用
                        // 2.3.3.3.2 如果 类reject()方法的执行存在返回值（拒因）时，修改.then方法返回的promise对象状态为rejected，结果值为相应的返回值（拒因）
                        reject(reason);
                    }
                );
            } catch (error) {
                // 2.3.3.3.4 如果自定义 then函数的调用 抛出报错 修改.then方法返回的promise对象状态为rejected，结果值为对应报错信息
                // 2.3.3.3.4.1 如果该报错已被捕获过 则忽略它
                // 2.3.3.3.4.2 反之则捕获报错 并作出相应处理
                if (called) return; // 如果已经被调用过 直接返回 不作后续处理
                called = true; // 表示已调用
                reject(error); // 捕获自定义 then函数的调用 抛出的报错 修改 .then方法返回的promise对象为rejected 结果值为对应报错信息
            }
        } else {
            // 2.3.3.4 如果 then属性不是函数 修改.then方法返回的promise对象状态为fulfilled，结果值为返回值
            resolve(handledResult);
        }
    } else {
        // 2.3.4  如果 返回值 既不是对象也不是函数 修改.then方法返回的promise对象状态为fulfilled，结果值为返回值
        resolve(handledResult);
    }
}

class myPromise {
    // 声明Promise状态
    static PENDING = "pending"; // 待处理（状态）
    static FULFILLED = "fulfilled"; // 已兑现（状态）
    static REJECTED = "rejected"; // 已拒绝（状态）
    constructor(excutor) {
        // promise对象构造器
        // 2.1.1 pengding状态的promise对象 其状态可以改变为 fulfilled / rejected 状态
        this.PromiseState = myPromise.PENDING; // 初始化 promise状态 为 pending状态
        this.PromiseResult = undefined; // 初始化 promise 结果
        this.handleFulfilledCb = []; // 存储 pending ---> fulfilled（已兑现状态）promise对象.then调用 的异步回调
        this.handleRejectedCb = []; // 存储 pengding ---> rejected（已拒绝状态）promise对象.then调用 的异步回调
        try {
            // 执行器函数 excutor的（同步）执行 在其内部用户可调用resolve/reject来改变promise对象状态
            // 这里需要使用bind()函数显式地设置 resolve,reject方法的this指向当前的promise对象， 以便保证resolve/reject的正确执行
            excutor(this.resolve.bind(this), this.reject.bind(this));
        } catch (error) {
            // 捕获执行器函数执行时抛出的报错 显式调用reject 修改当前promise对象的状态 结果值为对应报错信息
            this.reject(error);
        }
    }
    /**
     * 用于修改promise状态 为 fulfilled（已兑现状态）
     * @param { * } result promise对象的结果值（PromiseResult）
     */
    resolve(result) {
        // 2.1.2 fulfilled状态的promise对象 不得改变为任何其他状态 同时必须具有一个结果值
        // promise状态改变：只能从pending状态 改变为 fulfilled / rejected状态，promise状态一经改变 就不可变
        if (!isEqual(this.PromiseState, myPromise.PENDING)) return; // 如果 promise对象 不处于 pending状态，直接return 不再执行后续更改状态等相关逻辑
        this.PromiseState = myPromise.FULFILLED; // 修改promise对象状态
        this.PromiseResult = result; // 为promise对象的结果值 赋值
        this.handleFulfilledCb.forEach((cb) => cb()); // 执行 pengding ---> fulfilled（已兑现状态）promise对象.then调用 的异步回调
    }
    /**
     * 用于修改promise状态 为 rejected（已拒绝状态）
     * @param { * } reason promise对象的结果值（PromiseResult）
     */
    reject(reason) {
        // 2.1.3 rejected状态的promise对象 不得改变为任何其他状态 同时必须具有一个结果值（理由/拒因）
        // promise状态改变：只能从pending状态 改变为 fulfilled / rejected状态，promise状态一经改变 就不可变
        if (!isEqual(this.PromiseState, myPromise.PENDING)) return; // 如果 promise对象 不处于 pending状态，直接return 不再执行后续更改状态等相关逻辑
        this.PromiseState = myPromise.REJECTED; // 修改promise对象状态
        this.PromiseResult = reason; // 为promise对象的结果值 赋值
        this.handleRejectedCb.forEach((cb) => cb()); // 执行 pengding ---> rejected（已拒绝状态）promise对象.then调用 的异步回调
    }
    /**
     * 根据 this 指向的promise调用对象的 状态 处理传入的对应回调
     * @param { Function } onFulfilled promise调用对象状态为 fulfilled时 所调用的相应回调函数
     * @param { Function } onRejected promise调用对象状态为 rejected 所调用的相应回调函数
     * @returns { myPromise } 返回一个新的promise对象
     */
    then(onFulfilled, onRejected) {
        // 2.2.6 then方法支持链式调用
        // 2.2.6.1 当promise对象状态改变为 fulfilled 时，所有相应 onFulfilled回调根据原始调用顺序执行
        // 2.2.6.2 当promise对象状态改变为 rejected 时，所有相应 onRejected回调根据原始调用顺序执行
        // 声明用于返回的promise对象
        let promiseForReturn = new myPromise((resolve, reject) => {
            // 根据当前promise对象的状态执行对应回调
            switch (this.PromiseState) {
                case myPromise.FULFILLED:
                    // 2.2.4 onFulfilled函数在执行上下文堆栈仅包含平台代码之前，不得调用（即需要异步调用）
                    queueMicrotask(() => {
                        try {
                            // 2.2.1.1 如果onFulfilled不是函数 则必须忽略它
                            if (judgmentType(onFulfilled, 'function', true)) {
                                // 2.2.7.3 如果当前promise对象的状态为fulfilled，且onFulfilled不是一个函数 修改.then方法返回的promise对象的状态为fulfilled，同时继承当前promise对象的结果值
                                // onFulfilled不是函数时，就直接调用resolv() 修改 .then()调用所返回值的状态以及对应结果值
                                resolve(this.PromiseResult);
                            } else {
                                // 2.2.2.1 如果onFulfilled是一个函数 则将当前promise对象的结果值作为第一个参数传入onFulfilled函数中执行
                                // 2.2.2.3 onFulfilled函数只能执行一次，不能被多次调用
                                // 2.2.5 onFulfilled必须作为一个函数调用执行（在严格模式下）
                                // 2.2.7.1 如果onFulfilled的执行 存在返回值，凭此返回值 来决定 .then方法返回的promise对象的状态以及结果值
                                resolvePromise(
                                    promiseForReturn,
                                    onFulfilled(this.PromiseResult),
                                    resolve,
                                    reject
                                );
                            }
                        } catch (error) {
                            // 2.2.7.2 如果onFulfilled函数的执行 抛出报错 则修改.then方法返回的promise对象的状态为rejected，并将报错作为其结果值
                            // 捕获onFulfilled函数执行中 抛出的报错 修改.then方法返回的promise对象状态为rejected，结果值为对应报错信息
                            reject(error);
                        }
                    });
                    break;
                case myPromise.REJECTED:
                    // 2.2.4 onRejected函数在执行上下文堆栈仅包含平台代码之前，不得调用（即需要异步调用）
                    queueMicrotask(() => {
                        try {
                            // 2.2.1.2 如果onRejected不是函数 则必须忽略它
                            if (judgmentType(onRejected, 'function', true)) {
                                // 2.2.7.4 如果当前promise对象的状态为rejected，且onRejected不是一个函数 修改.then方法返回的promise对象的状态为fulfilled，同时继承当前promise对象的结果值（拒因）
                                // onRejected不是函数时，就直接调用resolv() 修改 .then()调用所返回值的状态以及对应结果值
                                reject(this.PromiseResult);
                            } else {
                                // 2.2.3.1 如果onRejected是一个函数 则将当前promise对象的结果值（拒因）作为第一个参数传入onRejected函数中执行
                                // 2.2.3.3 onRejected函数只能执行一次，不能被多次调用
                                // 2.2.5 onRejected必须作为一个函数调用执行（在严格模式下）
                                // 2.2.7.1 如果onRejected的执行 存在返回值，凭此返回值 来决定 .then方法返回的promise对象的状态以及结果值
                                resolvePromise(
                                    promiseForReturn,
                                    onRejected(this.PromiseResult),
                                    resolve,
                                    reject
                                );
                            }
                        } catch (error) {
                            // 2.2.7.2 如果onRejected函数的执行 抛出报错 则修改.then方法返回的promise对象的状态为rejected，并将报错作为其结果值
                            // 捕获onRejected函数执行中 抛出的报错 修改.then方法返回的promise对象状态为rejected，结果值为对应报错信息
                            reject(error);
                        }
                    });
                    break;
                case myPromise.PENDING:
                    // 2.2.2.2 当前promise对象状态为 fulfilled 时，才执行onFulfilled函数，在这之前不执行onFulfilled
                    // 2.2.3.2 当前promise对象状态为 rejected 时，才执行onRejected函数，在这之前不执行onRejected
                    // 当promise对象状态仍处于初始状态时，将对应的回调的相关处理，存储到一个数组中，等到promise对象状态改变为 fulfilled 时，在拿出执行
                    this.handleFulfilledCb.push(() => {
                        queueMicrotask(() => {
                            try {
                                if (judgmentType(onFulfilled, 'function', true)) {
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
                    // 2.2.3.2 当前promise对象状态为 rejected 时，才执行onRejected函数，在这之前不执行onRejected
                    // 当promise对象状态仍处于初始状态时，将对应的回调的相关处理，存储到一个数组中，等到promise对象状态改变为 rejected 时，在拿出执行
                    this.handleRejectedCb.push(() => {
                        queueMicrotask(() => {
                            try {
                                if (judgmentType(onRejected, 'function', true)) {
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
        // 2.2.7 .then方法调用必须返回一个新的promise对象
        // 返回新的Promise对象
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
        let p = this.constructor; // 获取当前实例的构造函数引用
        // onFinally回调函数的执行 不影响用于返回的promise对象的状态
        // 返回的promise对象状态及结果 继承自this指向的promise对象
        // 使用实例对象上的静态方法resolve() 将onFinally的返回值 或执行 统一转换成一个Promise对象。
        //  p.resolve(onFinally())的处理  用于应对onFinally中存在的异步操作，可以确保onFinally函数的完全执行完毕，再去处理待返Promise对象的状态
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
        // TODO 嵌套的 thenable 对象将被“深度展平”为单个 Promise 对象。
        if (isPromise(value)) return value; // 如果参数是Promise对象直接返回
        if (isThenable(value)) {
            // 如果参数是thenable对象，执行其then方法，并返回一个Promise对象
            return new myPromise((resolve, reject) => {
                value.then(resolve, reject);
            });
        }
        // 默认返回一个 fulfilled 状态的Promise对象 结果值为传入参数值
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
        // 返回一个Promise对象
        return new myPromise((resolve, reject) => {
            // 获取可迭代对象的长度/遍历可迭代对象 使用的语法 均只适配与可迭代对象
            // 如果在使用时产生报错 即说明用户传入的参数不是一个可迭代对象
            try {
                // 获取可迭代对象的长度
                const length = [...promises].length;
                const resultList = []; // 待返结果值 存储迭代值的结果
                // 如果是一个空的可迭代对象 直接修改待返Promise对象的状态为 fulfilled，
                if (isEqual(length, 0)) return resolve(resultList);
                let count = 0; // 遍历索引
                for (const promiseItem of promises) {
                    // 迭代值可以为任何类型，但都需要转换成Promise对象，不同的类型又有不同的转换操作
                    // 这里使用Promise静态方法 resolve 来进行转换
                    myPromise.resolve(promiseItem).then(
                        (result) => {
                            // 当前迭代值为fulfilled，存储其结果
                            resultList[count++] = result; // 存储完毕 索引后移
                            // 当索引等于可迭代对象的长度时，说明所有迭代值都为fulfilled，且所有结果都存储完毕，直接修改待返对象的状态为fulfilled
                            isEqual(count, length) && resolve(resultList);
                        },
                        (reason) => {
                            // 迭代值中只要有一个rejected，就直接修改待返对象的状态为rejected
                            reject(reason);
                        }
                    );
                }
            } catch (error) {
                // 用户传入的参数不是可迭代对象 直接修改待返对象的状态为rejected
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
                            // 当前迭代值为fulfilled，存储其结果 存储完毕后 索引后移
                            resultList[count++] = {
                                status: myPromise.FULFILLED,
                                value: result,
                            };
                            // 当索引等于可迭代对象的长度时，说明所有迭代值都为fulfilled，且所有结果都存储完毕，直接修改待返对象的状态为fulfilled
                            isEqual(count, length) && resolve(resultList);
                        },
                        (reason) => {
                            // 当前迭代值为rejected，存储其结果 存储完毕后 索引后移
                            resultList[count++] = {
                                status: myPromise.REJECTED,
                                value: reason,
                            };
                            // 当索引等于可迭代对象的长度时，说明所有迭代值都为fulfilled，且所有结果都存储完毕，直接修改待返对象的状态为fulfilled
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
                const reasonList = []; // 待返结果值 存储迭代值的结果
                // 如果是一个空的可迭代对象 直接修改待返Promise对象的状态为 rejected
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
                        // 迭代值中只要有一个fulfilled，就直接修改待返对象的状态为fulfilled
                        (result) => {
                            resolve(result);
                        },
                        (reason) => {
                            // 当前迭代值为rejected，存储其结果(拒因)
                            resultList[count++] = reason; // 存储完毕 索引后移
                            // 当索引等于可迭代对象的长度时，说明所有迭代值都为rejected，且所有结果都存储完毕，直接修改待返对象的状态为rejected
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
