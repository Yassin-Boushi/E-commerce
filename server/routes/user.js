const { User } = require("../models/user");
const { ImageUpload } = require("../models/imageUpload");
const { sendEmail } = require("../utils/emailService");

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const multer = require("multer");
const fs = require("fs");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.cloudinary_Config_Cloud_Name,
  api_key: process.env.cloudinary_Config_api_key,
  api_secret: process.env.cloudinary_Config_api_secret,
  secure: true,
});

var imagesArr = [];
const OTP_TTL_MS = 10 * 60 * 1000;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const createToken = (user) =>
  jwt.sign(
    { email: user.email, id: user._id, isAdmin: user.isAdmin },
    process.env.JSON_WEB_TOKEN_SECRET_KEY
  );

const sendOtpEmail = async (email, otp) =>
  sendEmailFun(email, "Verify Email", "", `Your OTP is ${otp}`);

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeOtp = (otp) => String(otp || "").trim();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
    //imagesArr.push(`${Date.now()}_${file.originalname}`)
  },
});

const upload = multer({ storage: storage });

router.post(`/upload`, upload.array("images"), async (req, res) => {
  imagesArr = [];

  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: "No images uploaded" });
    }

    for (let i = 0; i < req?.files?.length; i++) {
      const options = {
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      };

      const result = await cloudinary.uploader.upload(req.files[i].path, options);
      imagesArr.push(result.secure_url);
      fs.unlinkSync(req.files[i].path);
    }

    let imagesUploaded = new ImageUpload({
      images: imagesArr,
    });

    imagesUploaded = await imagesUploaded.save();
    return res.status(200).json(imagesArr);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Image upload failed",
      error: error.message,
    });
  }
});

router.post(`/signup`, async (req, res) => {
  const { name, phone, password, isAdmin } = req.body;
  const email = normalizeEmail(req.body.email);

  try {
    // Generate verification code
    const verifyCode = generateOtp();
    let user;

    // If the user exists but is not verified, update the existing user

    const existingUser = await User.findOne({ email: email });
    const existingUserByPh = await User.findOne({ phone: phone });

    if (existingUser?.isVerified) {
      return res.json({
        status: "FAILED",
        msg: "User already exist with this email!",
      });
    }

    if (
      existingUserByPh &&
      (!existingUser || String(existingUserByPh._id) !== String(existingUser._id))
    ) {
      return res.json({
        status: "FAILED",
        msg: "User already exist with this phone number!",
      });
    }

    if (existingUser) {
      const hashPassword = await bcrypt.hash(password, 10);
      existingUser.name = name;
      existingUser.phone = phone;
      existingUser.password = hashPassword;
      existingUser.isAdmin = Boolean(isAdmin);
      existingUser.otp = verifyCode;
      existingUser.otpExpires = Date.now() + OTP_TTL_MS; // 10 minutes
      await existingUser.save();
      user = existingUser;
    } else {
      // Create a new user
      const hashPassword = await bcrypt.hash(password, 10);

      user = new User({
        name,
        email,
        phone,
        password: hashPassword,
        isAdmin: Boolean(isAdmin),
        otp: verifyCode,
        otpExpires: Date.now() + OTP_TTL_MS, // 10 minutes
      });

      await user.save();
    }

    // Send verification email
    const emailSent = await sendOtpEmail(email, verifyCode);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        status: "FAILED",
        msg: "Failed to send OTP email. Check Gmail app password settings.",
      });
    }

    // Create a JWT token for verification purposes
    const token = createToken(user);

    // res.cookie('token', token, {
    //     httpOnly: false,
    //     sameSite: "none",0
    //     secure: true,
    //     maxAge: 3600000,
    // });

    // Send success response
    return res.status(200).json({
      success: true,
      message: "User registered successfully! Please verify your email.",
      token: token, // Optional: include this if needed for verification
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});

router.post(`/verifyAccount/resendOtp`, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    // Generate verification code
    const verifyCode = generateOtp();

    // If the user exists but is not verified, update the existing user

    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      existingUser.otp = verifyCode;
      existingUser.otpExpires = Date.now() + OTP_TTL_MS; // 10 minutes
      await existingUser.save();

      const emailSent = await sendOtpEmail(email, verifyCode);

      if (!emailSent) {
        return res.status(500).json({
          success: false,
          status: "FAILED",
          msg: "Failed to send OTP email. Check Gmail app password settings.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        existingUserId: existingUser._id,
      });
    }

    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});

router.put(`/verifyAccount/emailVerify/:id`, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    const existingUser = await User.findOne({ email: email });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (String(existingUser._id) !== String(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user verification request",
      });
    }

    const verifyCode = generateOtp();
    existingUser.otp = verifyCode;
    existingUser.otpExpires = Date.now() + OTP_TTL_MS;
    await existingUser.save();

    // Send verification email
    const emailSent = await sendOtpEmail(email, verifyCode);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        status: "FAILED",
        msg: "Failed to send OTP email. Check Gmail app password settings.",
      });
    }

    // Create a JWT token for verification purposes
    const token = createToken(existingUser);

    // Send success response
    return res.status(200).json({
      success: true,
      message: "OTP SEND",
      token: token, // Optional: include this if needed for verification
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});

const sendEmailFun = async (to, subject, text, html) => {
  const result = await sendEmail(to, subject, text, html);
  if (result.success) {
    return true;
    //res.status(200).json({ message: 'Email sent successfully', messageId: result.messageId });
  } else {
    return false;
    // res.status(500).json({ message: 'Failed to send email', error: result.error });
  }
};

router.post("/verifyemail", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = normalizeOtp(req.body.otp);

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const isCodeValid = normalizeOtp(user.otp) === otp;
    const isNotExpired = user.otpExpires && user.otpExpires.getTime() > Date.now();

    if (isCodeValid && isNotExpired) {
      user.isVerified = true;
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "OTP verified successfully" });
    } else if (!isCodeValid) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    } else {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }
  } catch (err) {
    console.log("Error in verifyEmail", err);
    res
      .status(500)
      .json({ success: false, message: "Error in verifying email" });
  }
});

router.post(`/signin`, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password, isAdmin } = req.body;

  try {
    const existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      res.status(404).json({ error: true, msg: "User not found!" });
      return;
    }

    const matchPassword = await bcrypt.compare(password, existingUser.password);

    if (!matchPassword) {
      return res.status(400).json({ error: true, msg: "Invailid credentials" });
    }

    if (existingUser.isVerified === false) {
      return res.json({
        error: true,
        isVerify: false,
        msg: "Your account is not active yet please verify your account first or Sign Up with a new user",
      });
    }

    if (isAdmin === true && existingUser.isAdmin !== true) {
      return res.status(403).json({ error: true, msg: "you are not a admin" });
    }

    const token = createToken(existingUser);

    return res.status(200).send({
      user: existingUser,
      token: token,
      msg: "User Authenticated",
    });
  } catch (error) {
    res.status(500).json({ error: true, msg: "something went wrong" });
    return;
  }
});

router.put(`/changePassword/:id`, async (req, res) => {
  const { name, phone, email, password, newPass, images } = req.body;

  // console.log(req.body)

  const existingUser = await User.findOne({ email: email });
  if (!existingUser) {
    res.status(404).json({ error: true, msg: "User not found!" });
  }

  const matchPassword = await bcrypt.compare(password, existingUser.password);

  if (!matchPassword) {
    res.status(404).json({ error: true, msg: "current password wrong" });
  } else {
    let newPassword;

    if (newPass) {
      newPassword = bcrypt.hashSync(newPass, 10);
    } else {
      newPassword = existingUser.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: name,
        phone: phone,
        email: email,
        password: newPassword,
        images: images,
      },
      { new: true }
    );

    if (!user)
      return res
        .status(400)
        .json({ error: true, msg: "The user cannot be Updated!" });

    res.send(user);
  }
});

router.get(`/`, async (req, res) => {
  const userList = await User.find();

  if (!userList) {
    res.status(500).json({ success: false });
  }
  res.send(userList);
});

router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res
      .status(500)
      .json({ message: "The user with the given ID was not found." });
  } else {
    res.status(200).send(user);
  }
});

router.delete("/:id", (req, res) => {
  User.findByIdAndDelete(req.params.id)
    .then((user) => {
      if (user) {
        return res
          .status(200)
          .json({ success: true, message: "the user is deleted!" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "user not found!" });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

router.get(`/get/count`, async (req, res) => {
  const userCount = await User.countDocuments();

  if (!userCount) {
    res.status(500).json({ success: false });
  }
  res.send({
    userCount: userCount,
  });
});

router.post(`/authWithGoogle`, async (req, res) => {
  const { name, phone, password, images, isAdmin } = req.body;
  const email = normalizeEmail(req.body.email);

  try {
    const existingUser = await User.findOne({ email: email });

    if (existingUser && isAdmin === true && existingUser.isAdmin !== true) {
      return res.status(403).json({ error: true, msg: "you are not a admin" });
    }

    if (!existingUser) {
      const result = await User.create({
        name: name,
        phone: phone,
        email: email,
        password: password,
        images: images,
        isAdmin: Boolean(isAdmin),
        isVerified: true,
      });

      const token = createToken(result);

      return res.status(200).send({
        user: result,
        token: token,
        msg: "User Login Successfully!",
      });
    } else {
      const existingUser = await User.findOne({ email: email });
      const token = createToken(existingUser);

      return res.status(200).send({
        user: existingUser,
        token: token,
        msg: "User Login Successfully!",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.put("/:id", async (req, res) => {
  const { name, phone, email } = req.body;

  const userExist = await User.findById(req.params.id);

  let newPassword;

  if (req.body.password) {
    newPassword = bcrypt.hashSync(req.body.password, 10);
  } else {
    newPassword = userExist.password;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: name,
      phone: phone,
      email: email,
      password: newPassword,
      images: imagesArr,
    },
    { new: true }
  );

  if (!user) return res.status(400).send("the user cannot be Updated!");

  res.send(user);
});

router.delete("/deleteImage", async (req, res) => {
  const imgUrl = req.query.img;

  // console.log(imgUrl)

  const urlArr = imgUrl.split("/");
  const image = urlArr[urlArr.length - 1];

  const imageName = image.split(".")[0];

  const response = await cloudinary.uploader.destroy(
    imageName,
    (error, result) => {
      // console.log(error, res)
    }
  );

  if (response) {
    res.status(200).send(response);
  }
});

router.post(`/forgotPassword`, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  try {
    // Generate verification code
    const verifyCode = generateOtp();

    // If the user exists but is not verified, update the existing user

    const existingUser = await User.findOne({ email: email });

    if (!existingUser) {
      res.json({ status: "FAILED", msg: "User not exist with this email!" });
      return;
    }

    if (existingUser) {
      existingUser.otp = verifyCode;
      existingUser.otpExpires = Date.now() + OTP_TTL_MS; // 10 minutes
      await existingUser.save();
    }

    // Send verification email
    const emailSent = await sendOtpEmail(email, verifyCode);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        status: "FAILED",
        msg: "Failed to send OTP email. Check Gmail app password settings.",
      });
    }

    // Send success response
    return res.status(200).json({
      success: true,
      status: "SUCCESS",
      message: "OTP Send",
    });
  } catch (error) {
    console.log(error);
    res.json({ status: "FAILED", msg: "something went wrong" });
    return;
  }
});


router.post(`/forgotPassword/changePassword`, async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { newPass } = req.body;
  
    try {
  
      const existingUser = await User.findOne({ email: email });
  
    if (existingUser) {
      const hashPassword = await bcrypt.hash(newPass, 10);
      existingUser.password = hashPassword;
      await existingUser.save();
    } else {
      return res.status(404).json({
        success: false,
        status: "FAILED",
        msg: "User not found",
      });
    }
     

      // Send success response
      return res.status(200).json({
        success: true,
        status:"SUCCESS",
        message: "Password change successfully",
      });
    } catch (error) {
      console.log(error);
      res.json({ status: "FAILED", msg: "something went wrong" });
      return;
    }
  });

module.exports = router;
