// @ts-check

export default class MaxLengthArray<T> extends Array<T> {
    _maxLength = 0;
    /**
     * @param {number} maxLength 
     */
    constructor(maxLength  = 0) {
        super();
        this.maxLength = maxLength;
    }
    set maxLength(value) {
        this._maxLength = value;
        if(this.length > value){
            this.length = value;
        }
    }
    get maxLength() {
        return this._maxLength;
    }

    push(item:T) {
        const ret = super.push(item);
        if (this.length >= this.maxLength) {
            const diff = this.length - this.maxLength;
            this.splice(0, diff);
        }
        return ret;
    }
    
    unshift(item:T) {
        const ret = super.unshift(item);
        if (this.length >= this.maxLength) {
            this.length = this.maxLength;
        }
        return ret;
    }

}
