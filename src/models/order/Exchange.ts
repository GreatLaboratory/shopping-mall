import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type ExchangeDocument = Document & {
    _id: string;  // 고유 아이디
    cartId: string; // 주문 아이디

    exchangeColor: string;  // 교환하려는 상품의 컬러
    exchangeSize: string;  // 교환하려는 상품의 사이즈
    
    deliveryId: string;   // 배송 아이디
    deliveryFirm: string;  // 배송 택배사
    deliveryNumber: string; // 배송 운송장 번호

    reason: string; // 교환 사유
    content: string; // 교환 사유 상세내용
    image: string; // 교환 사유 사진
}

const exchangeSchema = new Schema({
    exchangeColor: String,
    exchangeSize: String,
    deliveryId: String,
    deliveryFirm: String,
    deliveryNumber: String,
    reason: {
        type: String,
        enum: ['단순 변심', '배송 불가 지역', '포장 불량', '배송 지연', '상품정보 상이', '사이즈', '기타'],
    },
    content: String,
    image: String,
    cartId: {
        type: ObjectId,
        ref: 'Cart'
    }
});

export const Exchange = model<ExchangeDocument>('Exchange', exchangeSchema);
