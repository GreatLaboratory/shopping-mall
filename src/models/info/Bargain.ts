import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;
export type BargainDocument = Document & {
    _id: string;  // 고유 아이디
    title: string;  // 제목
    content: string;  // 내용
    startDate: Date; // 이벤트 시작 날짜
    endDate: Date; // 이벤트 종료 날짜
    
    bannerImage: string;  // 배너 이미지

    productIdList: string[];  // 기획전 상품 목록
}

const bargainSchema = new Schema({
    title: String,
    content: String,
    startDate: Date,
    endDate: Date,
    bannerImage: String,
    productIdList: [
        {
            type: ObjectId,
            ref: 'Product'
        }
    ]
});

export const Bargain = model<BargainDocument>('Bargain', bargainSchema);
