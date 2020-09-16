import { Router } from 'express';

import { productUploader } from './middleWares/uploader';
import { getBestProductList, getProductListForAdmin, getCategoryProductList, getProduct, getRecommendProductList, getCategorys, addFirstCategory, addSecondCategory, uploadMainImages, uploadSubImages, addProduct, deleteProduct, getNewProductList, getBestProductListInMarket, getCategoryProductListInMarket, searchProduct, modifyProductInfo, modifyProductStockAndSize, modifyProductSubImages, modifyProductMainImages, searchProductForMarket, getLookBookList, getLookBookListForAdmin, addLookBook, modifyLookBookInfo, deleteLookBook, uploadLookBookMainImages, modifyLookBookSubImages } from '../controllers/productController';

class ProductRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 카테고리 목록 조회하기
        this.router.get('/getCategorys', getCategorys);

        // 상위 카테고리 추가하기
        this.router.post('/addFirstCategory', addFirstCategory);
        
        // 하위 카테고리 추가하기
        this.router.post('/addSecondCategory', addSecondCategory);

        // 상품의 메인 이미지 업로드
        this.router.post('/uploadMainImages', productUploader.array('mainImages', 3), uploadMainImages);
        
        // 상품의 서브 이미지 업로드
        this.router.post('/uploadSubImages', productUploader.array('subImages', 100), uploadSubImages);

        // 상품의 세부 정보 등록하기
        this.router.post('/addProduct', addProduct);

        // 상품 삭제하기
        this.router.post('/deleteProduct', deleteProduct);

        // 신규상품 5%OFF 리스트 조회하기
        this.router.get('/newList/:page', getNewProductList);
        
        // 판매량 순으로 상품 리스트 조회하기
        this.router.get('/bestList/:page', getBestProductList);
        
        // 추천상품 리스트 조회하기 (랜덤뽑기)
        this.router.get('/randomList/:page', getRecommendProductList);

        // 카테고리별로 상품 목록 조회하기
        this.router.get('/category/:page', getCategoryProductList);
        
        // 상품 상세조회하기
        this.router.get('/:productId', getProduct);
        
        // 입점관리자 또는 슈퍼관리자 웹패널에서 상품 목록 조회하기
        this.router.get('/forAdmin/:page', getProductListForAdmin);

        // 서비스화면에서 마켓페이지에서 BEST상품 4개 조회
        this.router.get('/bestInMarket/:marketId', getBestProductListInMarket);
        
        // 서비스화면에서 마켓페이지에서 카테고리별 상품 조회
        this.router.get('/categoryInMarket/:marketId', getCategoryProductListInMarket);

        // 상품 검색 조회
        this.router.get('/search/:page', searchProduct);
        
        // 단순정보 수정하기
        this.router.put('/info/:productId', modifyProductInfo);
        
        // 재고 및 사이즈 정보 수정하기
        this.router.put('/stockSize/:productId', modifyProductStockAndSize);
        
        // 메인 이미지 수정하기
        this.router.put('/mainImages/:productId', productUploader.array('mainImages', 3), modifyProductMainImages);
        
        // 서브 이미지 수정하기
        this.router.put('/subImages/:productId', productUploader.array('subImages', 100), modifyProductSubImages);

        // 마켓상품 검색 조회
        this.router.get('/searchForMarket/:page', searchProductForMarket);

        // 서비스화면에서 룩북 상품리스트 조회하기
        this.router.get('/getLookBook/:page', getLookBookList);

        // 관리자 패널에서 룩북 상품리스트 조회하기
        this.router.get('/getLookBookForAdmin/:page', getLookBookListForAdmin);
      
        // 룩북 상품 등록하기
        this.router.put('/addLookBook/:productId', addLookBook);

        // 룩북 상품 정보 수정하기
        this.router.put('/modifyLookBook/:productId', modifyLookBookInfo);

        // 룩북상품 리스트에서 삭제하기
        this.router.put('/deleteLookBook/:productId', deleteLookBook);

        // 룩북 메인 이미지 업로드하기
        this.router.post('/uplodLookBookMainImages', productUploader.array('lookBookMainImages', 3), uploadLookBookMainImages);

        // 룩북 서브 이미지 업로드하기
        this.router.post('/uploadLookBookSubImages', productUploader.array('lookBookSubImages', 10), uploadLookBookMainImages);

        // 룩북 메인 이미지 수정하기
        this.router.put('/lookBookMainImages/:productId', productUploader.array('lookBookMainImages', 3), uploadLookBookMainImages);

        // 룩북 서브 이미지 수정하기
        this.router.put('/lookBookSubImages/:productId', productUploader.array('lookBookSubImages', 10), modifyLookBookSubImages);
    }
}

const productRouter = new ProductRouter();
export default productRouter.router;
