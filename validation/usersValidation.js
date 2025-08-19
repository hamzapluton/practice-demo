import isEmpty from 'is-empty';
import validator from 'validator';

const otpValidation = (data) => {
    const errors = [];
    let {email, otp} = data;
    
    // Convert empty fields to an empty string, so we can use validator functions
    email = isEmpty(email) ? '' : email;
    otp = isEmpty(otp) ? '' : otp;

    //Email Validation
    if (validator.isEmpty(email)) {
        errors.push('Email field is required');
    } else if (!validator.isEmail(email)) {
        errors.push('Email is invalid');
    }

    //Password Validation
    if (validator.isEmpty(otp)) {
        errors.push('Otp field is required'); 
    }
        console.log(errors)
    return {
        errors,
        hasErrors: errors.length > 0,
    };
};


const loginValidation = (data) => {
    const errors = [];
    let {email, password} = data;

    // Convert empty fields to an empty string, so we can use validator functions
    email = isEmpty(email) ? '' : email;
    password = isEmpty(password) ? '' : password;

    //Email Validation
    if (validator.isEmpty(email)) {
        errors.push('Email field is required');
    } else if (!validator.isEmail(email)) {
        errors.push('Email is invalid');
    }

    //Password Validation
    if (validator.isEmpty(password)) {
        errors.push('Password field is required');
    }

    return {
        errors,
        hasErrors: errors.length > 0,
    };
};

const registerValidation = (data) => {
    const errors = [];
    let {
        type, name, phone, firstName, middleName , lastName, email, passport,
        passportExpireDate, bankAccount, password, fundsLegalSource, RFC, CURP
    } = data;
console.log(data,"DATA")
    // Convert empty fields to an empty string, so we can use validator functions
    // type = isEmpty(type) ? '' : type;
    // name = isEmpty(name) ? '' : name;
    // lastName = isEmpty(lastName) ? '' : lastName;
    // phone = isEmpty(phone) ? '' : phone;
    firstName = isEmpty(firstName) ? '' : firstName;
    middleName = isEmpty(middleName) ? '' : middleName;
    
    lastName = isEmpty(lastName) ? '' : lastName;
    // email = isEmpty(email) ? '' : email;
    passport = isEmpty(passport) ? '' : passport;
    passportExpireDate = isEmpty(passportExpireDate) ? '' : passportExpireDate;
    bankAccount = isEmpty(bankAccount) ? '' : bankAccount;
    fundsLegalSource = isEmpty(fundsLegalSource) ? '' : fundsLegalSource;
    RFC = isEmpty(RFC) ? '' : RFC;
    CURP = isEmpty(CURP) ? '' : CURP;

    //RFC Validation
    if (validator.isEmpty(RFC)) errors.push('RFC field is required');

    //CURP Validation
    if (validator.isEmpty(CURP)) errors.push('CURP field is required');

    //Type Validation
    // if (validator.isEmpty(type)) errors.push('type field is required');

    //Name Validation
    // if (validator.isEmpty(name)) errors.push('name field is required');

    //email Validation
    // if (validator.isEmpty(email)) errors.push('email field is required');
    // else if (!validator.isEmail(email)) errors.push('Email is invalid');

    // phone Validation
    // if (validator.isEmpty(phone)) errors.push('phone field is required');

    //Last Name Validation
    // if (validator.isEmpty(lastName)) errors.push('last name field is required');

    //Passport Validation
    if (validator.isEmpty(passport)) errors.push('passport field is required');

    //Password Validation
    //   if (validator.isEmpty(password)) errors.push('password field is required');
    //   else if (validator.isStrongPassword(password)) {
    //     errors.push(
    //       'password length must be 8, 1 lowercase alphabet, 1 uppercase alphabet, 1 minimum number and 1 special character'
    //     );
    //   }

    if (validator.isEmpty(firstName))
    errors.push('First Name field is required');

    if (validator.isEmpty(lastName))
        errors.push('Last Name field is required');

    if (validator.isEmpty(middleName))
        errors.push('Middle Name field is required');

    if (validator.isEmpty(bankAccount))
        errors.push('bankAccount field is required');

    //   if (validator.isEmpty(fundsLegalSource))
    //     errors.push('Fund Legal Source field is required');

    if (validator.isEmpty(passportExpireDate))
        errors.push('passport expire date field is required');
    else if (!validator.toDate(passportExpireDate)) {
        errors.push('invalid passport expiry date');
    }



    return {
        errors: errors.join(','),
        hasErrors: errors.length > 0,
    };
};

export {loginValidation, registerValidation,otpValidation};
