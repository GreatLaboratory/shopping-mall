import axios from 'axios';
import { Router, Request, Response, NextFunction } from 'express';

import { TOSS_API_KEY } from '../config/secret';

class TossRouter {
    public router: Router;

    constructor () {
        this.router = Router();
        this.routes();
    }

    private routes (): void {
        // 토스 결제하기
        this.router.post('/', async (req: Request, res: Response, next: NextFunction) => {
            const { orderNo, amount, amountTaxFree, productDesc, autoExecute, resultCallback, retUrl, retCancelUrl } = req.body;
            const api = axios.create({ headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Origin, Content-Type, X-Auth-Token'
            }});
            try {
                const result = await api.post('https://pay.toss.im/api/v1/payments', {
                    orderNo,
                    amount,
                    amountTaxFree,
                    productDesc,
                    apiKey: TOSS_API_KEY,
                    autoExecute,
                    resultCallback,
                    retUrl,
                    retCancelUrl
                });
                res.status(201).json(result.data);
            } catch (err) {
                console.log(err);
                next(err);
            }
        });
    }
}

const tossRouter = new TossRouter();
export default tossRouter.router;
