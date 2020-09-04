import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type SizeDocument = Document & {
    _id: string;  // 고유 아이디
    productId: string;
    name: string;  // 사이즈 이름 S, M, L
    
    total: string;  // 총 길이
    shoulder: string;  // 어깨 너비
    chest: string;  // 가슴 너비
    arm: string;  // 소매 너비

    waist: string;  // 허리 둘레
    thigh: string;  // 허벅지 둘레
    mitWi: string;  // 밑위
    mitDoole: string;  // 밑단 둘레

    width: string;  // 가로
    length: string;  // 높이
    breadth: string; // 폭
}

const sizeSchema = new Schema({
    name: String,
    total: String,
    shoulder: String,
    chest: String,
    arm: String,
    waist: String,
    thigh: String,
    mitWi: String, 
    mitDoole: String,
    width: String, 
    length: String, 
    breadth: String,
    productId: {
        type: ObjectId,
        ref: 'Product'
    }
});

export const Size = model<SizeDocument>('Size', sizeSchema);
