import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type AddressDocument = Document & {
    _id: string;  // 고유 아이디
    userId: string; // 사용자 아이디

    address: string;  // 주소
    addressDetail: string;  // 상세 주소
    zipCode: string;  // 지번

    createdAt: Date;
}

const addressSchema = new Schema({
    address: String,
    addressDetail: String,
    zipCode: String,
    userId: {
        type: ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

export const Address = model<AddressDocument>('Address', addressSchema);
