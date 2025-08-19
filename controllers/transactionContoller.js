import _ from 'loadsh'
import Transaction from "#models/transactionModel";
import asyncHandler from 'express-async-handler';
import AdminTransaction from '#models/adminTransactionModel';


const getTransactions = asyncHandler(async (req, res) => {
let transactions ;

if(req.query.startDate !== 'undefined' && req.query.endDate !== 'undefined')
{
    const startDate = new Date(req.query.startDate).toISOString();
const endDate = new Date(req.query.endDate).toISOString();
// endDate.setDate(endDate.getDate() + 1); // Include the end date in the query
// endDate.setHours(0, 1, 0, 0);

const query = { purchasedAt: {
    $gte: startDate, $lt: endDate
} };

if(req.query.type == "offer"){
    query.type = req.query.type
}

    transactions = await Transaction.find(query).populate('storeId',{title_en: 1})
    .populate('userId', {name: 1 , email:1})
    .select('-__v');
}
else{
    let filter = { isDeleted:false}
    if(req.query.type == "offer"){
        filter.type = req.query.type
    }
  transactions = await Transaction.find(filter)
        .populate('storeId',{title_en: 1})
        .populate('userId', {name: 1 , email:1})
        .select('-__v')
}

    if (!transactions)
        return res.status(200).json({ status: false,  message: 'Transaction does not exist'});

    transactions = JSON.parse(JSON.stringify(transactions));

    const updateTransactions = transactions.map(transaction => {
        const storeName = _.get(transaction,'storeId.title_en', '');
        const userName = _.get(transaction,'userId.name', '');
        const userEmail  = _.get(transaction,'userId.email', '');

        delete transaction.userId;
        delete transaction.storeId;

        return {...transaction, storeName,userName,userEmail}
    });


    res.status(200).json({
        status: true,
        transactions: updateTransactions
    });
});


const getAdminTransactions = asyncHandler(async (req, res) => {
    let transactions ;
    
    if(req.query.startDate !== 'undefined' && req.query.endDate !== 'undefined')
    {
        const startDate = new Date(req.query.startDate).toISOString();
    const endDate = new Date(req.query.endDate).toISOString();
    // endDate.setDate(endDate.getDate() + 1); // Include the end date in the query
    // endDate.setHours(0, 1, 0, 0);
    
    const query = { purchasedAt: {
        $gte: startDate, $lt: endDate
    } };
    
    
        transactions = await AdminTransaction.find(query).populate('storeId',{title_en: 1})
        .populate({
            path: 'userTransactionId', // Populate the userTransactionId field
            populate: {
              path: 'userId', // Populate the userId field within userTransactionId
            },
          })
    }
    else{
      transactions = await AdminTransaction.find({isDeleted:false})
            .populate('storeId',{title_en: 1})
            .populate({
                path: 'userTransactionId', // Populate the userTransactionId field
                populate: {
                  path: 'userId', // Populate the userId field within userTransactionId
                },
              })
    }
    
        if (!transactions)
            return res.status(200).json({ status: false,  message: 'Transaction does not exist'});
    
        transactions = JSON.parse(JSON.stringify(transactions));
    
        const updateTransactions = transactions.map(transaction => {
            const storeName = _.get(transaction,'storeId.title_en', '');
            const userName = _.get(transaction,'userId.name', '');
            const userEmail  = _.get(transaction,'userId.email', '');
    
            delete transaction.userId;
            delete transaction.storeId;
    
            return {...transaction, storeName,userName,userEmail}
        });
    
    
        res.status(200).json({
            status: true,
            transactions: updateTransactions
        });
    });

export {getTransactions,getAdminTransactions}
