import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export interface IResponseProduct {
    product?: ProductDocument;
    marketImage: string;
    lookBookMainImages: string[];
    marketName: string;
    name: string;
    lookBookCreatedAt: Date;
    
}		

export type ProductDocument = Document & {
    _id: string;  // 고유 아이디

    marketId: string; // 등록한 마켓 아이디
    firstCategoryId: string;  // 상위 카테고리
    secondCategoryId: string;  // 하위 카테고리
    sizeIdList: string[];  // 여러 가능한 사이즈 목록
    stockIdList: string[];  // 재고 -> 사이즈 / 컬러별 수량 리스트
    coordinateProductIdList: string[]; // 함께 코디할 상품 아이디 리스트
    modelId: string;  // 모델 정보
    qualityId: string;  // 재질 정보

    name: string;  // 이름
    marketName: string; // 마켓 이름
    price: number;  // 가격
    discountRate: number;  // 할인율
    tags: string[];  // 관련 태그들
    fabric: string;  // 소재
    modelFitting: string;  // 모델 피팅
    laundry: string;  // 세탁 방법
    description: string[];  // 상품 설명
    createdAt: Date;  // 상품 등록날짜

    mainImages: string[];  // 대표 이미지
    subImages: string[];  // 서브 이미지
    bannerImage: string;  // 배너 이미지
    
    rejectReason: string;  // 판매 거절 사유
    allowStatus: string;  // 판매 허가, 판매 거절, 판매 심사중
    
    like: number;  // 좋아요 수
    review: number;  // 리뷰 수

    sales: number;  // 판매량

    lookBook: boolean; // 룩북 등록 여부
    lookBookCreatedAt: Date | null; // 룩북 등록날짜
    lookBookMainImages: string[];  // 룩북 대표 이미지
    lookBookSubImages: string[];  // 룩북 서브 이미지
    lookBookCoordinateIdList: string[]; // 룩북 코디 상품 리스트
}

const productSchema = new Schema({
    marketId: {
        type: ObjectId,
        // required: true,
        ref: 'Market'
    },
    firstCategoryId: {
        type: ObjectId,
        // required: true,
        ref: 'FirstCategory'
    },
    secondCategoryId: {
        type: ObjectId,
        // required: true,
        ref: 'SecondCategory'
    },
    sizeIdList: [
        {
            type: ObjectId,
            // required: true,
            ref: 'Size'
        }
    ],
    stockIdList: [
        {
            type: ObjectId,
            required: false,
            ref: 'Stock'
        }
    ],
    coordinateProductIdList: [
        {
            type: ObjectId,
            // required: true,
            ref: 'Product'
        }
    ],
    qualityId: {
        type: ObjectId,
        // required: true,
        ref: 'Quality'
    },
    modelId: {
        type: ObjectId,
        // required: true,
        ref: 'Model'
    },
    name: String,
    marketName: String,
    price: Number,
    discountRate: Number,
    tags: Array,
    fabric: String,
    modelFitting: String,
    laundry: String,
    mainImages: Array,
    subImages: Array,
    bannerImage: String,
    description: Array,  
    rejectReason: String,
    createdAt: Date,
    allowStatus: {
        type: String,
        enum: ['판매 허가', '판매 거절', '판매 심사중'],
    },
    like: {
        type: Number,
        default: 0
    },
    review: {
        type: Number,
        default: 0
    },
    sales: {
        type: Number,
        default: 0
    },
    lookBook: Boolean,
    lookBookCreatedAt: Date,
    lookBookMainImages: Array,
    lookBookSubImages: Array,
    lookBookCoordinateIdList: 
    [
        {
            type: ObjectId,
            // required: true,
            ref: 'Product'
        }
    ],
});

export const Product = model<ProductDocument>('Product', productSchema);
