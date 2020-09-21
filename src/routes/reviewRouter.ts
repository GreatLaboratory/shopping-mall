import { Router } from 'express';

import { reviewUploader } from './middleWares/uploader';
import { review, reply, forUser, forMarket, forProduct, forImageReview, forNormalReview, getOrderList, updateReview, totalReview } from '../controllers/reviewController';
import { verifyJwtToken } from './middleWares/authValidation';

class ReviewRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 리뷰 등록하기
        this.router.post('/', reviewUploader.single('image'), review);
        
        // 리뷰 수정하기
        this.router.put('/update/:reviewId', updateReview);

        // 리뷰 답변하기
        this.router.put('/reply', reply);

        // 후기 작성 가능한 주문 목록 조회하기
        this.router.get('/getOrderList/:page', verifyJwtToken, getOrderList);

        // 사용자가 자신이 후기 남긴 내역 조회하기
        this.router.get('/forUser/:page', verifyJwtToken, forUser);

        // 판매자 패널에서 리뷰 목록 조회하기
        this.router.get('/forMarket/:marketId/:page', forMarket);
        
        // 상품 상세보기에서 전체리뷰 목록 조회하기
        this.router.get('/forProduct/:productId', forProduct);

        // 상품 상세보기에서 포토리뷰 목록 조회하기
        this.router.get('/forProductImageReview/:productId/:page', forImageReview);
        
        // 상품 상세보기에서 일반리뷰 목록 조회하기
        this.router.get('/forProductNormalReview/:productId/:page', forNormalReview);

        // 관리자 페이지에서 전체 후기 조회하기
        this.router.get('/totalReview/:page', totalReview);
    }
}

const reviewRouter = new ReviewRouter();
export default reviewRouter.router;
