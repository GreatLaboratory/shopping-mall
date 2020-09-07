import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type FirstCategoryDocument = Document & {
    _id: string;  // 고유 아이디
    name: string;  // 상위 카테고리 이름
    secondCategoryIdList: string[];  // 하위 카테고리 아이디 리스트
}

const firstCategorySchema = new Schema({
  	name: String,
    secondCategoryIdList: [{
      	type: ObjectId,
      	required: true,
      	ref: 'SecondCategory'
    }]
});

export const FirstCategory = model<FirstCategoryDocument>('FirstCategory', firstCategorySchema);
