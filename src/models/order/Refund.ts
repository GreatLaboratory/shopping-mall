import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type RefundDocument = Document & {
    _id: string;  // 고유 아이디
    cartId: string; // 주문 아이디

    deliveryId: string;   // 배송 아이디
    deliveryFirm: string;  // 배송 택배사
    deliveryNumber: string;  // 배송 운송장 번호
    deliveryFee: string;  // 반품 배송비

    bankName: string;  // 환불 계좌 은행
    accountNum: string;  // 환불 계좌 번호

    reason: string; // 교환 사유
    content: string; // 교환 사유 상세내용
    image: string; // 교환 사유 사진
}

const refundSchema = new Schema({
    deliveryId: String,
    deliveryFirm: String,
    deliveryNumber: String,
    deliveryFee: {
        type: String,
        enum: ['2500', '5000']
    },
    bankName: String,
    accountNum: String,
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

export const Refund = model<RefundDocument>('Refund', refundSchema);
