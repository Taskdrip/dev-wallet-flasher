import { Router, type IRouter } from "express";
import healthRouter from "./health";
import walletsRouter from "./wallets";
import faucetRouter from "./faucet";
import transferRouter from "./transfer";
import transactionsRouter from "./transactions";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(walletsRouter);
router.use(faucetRouter);
router.use(transferRouter);
router.use(transactionsRouter);
router.use(adminRouter);

export default router;
