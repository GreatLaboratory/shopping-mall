import { Document, Schema, model } from 'mongoose';

export type QualityDocument = Document & {
    _id: string;  // 고유 아이디
    an: string;  // 안감
    sin: string;  // 신축성
    bi: string;  // 비침
    du: string;  // 두께감
    fit: string;  // 핏
}

const qualitySchema = new Schema({
    an: String,
    sin: String,
    bi: String,
    du: String,
    fit: String,
});

export const Quality = model<QualityDocument>('Quality', qualitySchema);
