const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv/config');

// Log the Stripe key to verify it's loaded
console.log('Stripe Secret Key Loaded:', process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No');
if (!process.env.STRIPE_SECRET_KEY) {
    console.error("FATAL ERROR: STRIPE_SECRET_KEY is not defined.");
    process.exit(1);
}

if (!process.env.CONNECTION_STRING) {
    console.error("FATAL ERROR: CONNECTION_STRING is not defined.");
    process.exit(1);
}

app.use(cors());
app.options('*', cors())

//middleware
app.use(bodyParser.json());
app.use(express.json());


//Routes
const userRoutes = require('./routes/user.js');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const imageUploadRoutes = require('./helper/imageUpload.js');
const productWeightRoutes = require('./routes/productWeight.js');
const productRAMSRoutes = require('./routes/productRAMS.js');
const productSIZESRoutes = require('./routes/productSize.js');
const productReviews = require('./routes/productReviews.js');
const cartSchema = require('./routes/cart.js');
const myListSchema = require('./routes/myList.js');
const ordersSchema = require('./routes/orders.js');
const homeBannerSchema = require('./routes/homeBanner.js');
const searchRoutes = require('./routes/search.js');
const bannersSchema = require('./routes/banners.js');
const homeSideBannerSchema = require('./routes/homeSideBanner.js');
const homeBottomBannerSchema = require('./routes/homeBottomBanner.js');

app.use("/api/user",userRoutes);
app.use("/uploads",express.static("uploads"));
app.use(`/api/category`, categoryRoutes);
app.use(`/api/products`, productRoutes);
app.use(`/api/imageUpload`, imageUploadRoutes);
app.use(`/api/productWeight`, productWeightRoutes);
app.use(`/api/productRAMS`, productRAMSRoutes);
app.use(`/api/productSIZE`, productSIZESRoutes);
app.use(`/api/productReviews`, productReviews);
app.use(`/api/cart`, cartSchema);
app.use(`/api/my-list`, myListSchema);
app.use(`/api/orders`, ordersSchema);
app.use(`/api/homeBanner`, homeBannerSchema);
app.use(`/api/search`, searchRoutes);
app.use(`/api/banners`, bannersSchema);
app.use(`/api/homeSideBanners`, homeSideBannerSchema);
app.use(`/api/homeBottomBanners`, homeBottomBannerSchema);



//Database
mongoose.connect(process.env.CONNECTION_STRING)
    .then(() => {
        console.log('Database Connection is ready...');
        //Server
        app.listen(process.env.PORT, () => {
            console.log(`server is running http://localhost:${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.error('Database connection failed:', err.message);
        console.error('Check server/.env CONNECTION_STRING and MongoDB network access.');
        process.exit(1);
    })
