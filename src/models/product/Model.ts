import { Document, Schema, model } from 'mongoose';

export type ModelDocument = Document & {
    _id: string;  // 고유 아이디
    height: string;  // 키
    weight: string;  // 몸무게
    top: string;  // 상의
    bottom: string;  // 하의
    shoes: string;  // 신발
}

const modelSchema = new Schema({
    height: String,
    weight: String,
    top: String,
    bottom: String,
    shoes: String,
});

export const Model = model<ModelDocument>('Model', modelSchema);
