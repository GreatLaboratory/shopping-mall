import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type StockDocument = Document & {
    _id: string;
    productId: string;
    color: string;
    size: string;
    optionPrice: number;
    stockNum: number;
}

const stockSchema = new Schema({
    color: String,
    size: String,
    optionPrice: Number,
    stockNum: Number,
    productId: {
        type: ObjectId,
        ref: 'Product'
    }
});

export const Stock = model<StockDocument>('Stock', stockSchema);
