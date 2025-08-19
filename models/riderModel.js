import mongoose from 'mongoose';

const riderSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required']
  },
  phone: {
    type: Number,
    required: [true, 'Phone number is required'],
    // validate: {
    //   validator: function (value) {
    //     return /^\d{10}$/.test(value);
    //   },
    //   message: 'Please enter a valid 10-digit phone number'
    // }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please enter a valid email address'
    ]
  },
  resume: {
    type: String
  },
  coverLetter: {
    type: String
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  dateOfBirth: {
    type: Date
  },
  education: [
    {
      school: String,
      degree: String,
      discipline: String,
      startDate: Date,
      endDate: Date
    }
  ],
  experience: [
    {
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      description: String
    }
  ],
  link: {
    type: String
  },
  postingApplying:{
    type: String  
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'wallet_bank'
},
userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
},
isVerified: {
    type: Boolean,
    default: false
},
isDeleted: {
  type: Boolean,
  default: false
},
},{timestamps: {createdAt: true, updatedAt: true}});

const Rider = mongoose.model('Rider', riderSchema);

export default Rider;
