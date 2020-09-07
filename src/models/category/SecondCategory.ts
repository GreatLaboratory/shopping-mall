import { Document, Schema, model } from 'mongoose';
const { Types : { ObjectId } } = Schema;

export type SecondCategoryDocument = Document & {
	_id: string;  // 고유 아이디
	name: string;  // 하위 카테고리 이름
    firstCategoryId: string;  // 상위 카테고리 아이디
}

const secondCategorySchema = new Schema({
  	name: String,
  	firstCategoryId: {
    	type: ObjectId,
    	ref: 'FirstCategory'
  	}
});

export const SecondCategory = model<SecondCategoryDocument>('SecondCategory', secondCategorySchema);
