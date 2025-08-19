import bcrypt from "bcryptjs";

const salt = bcrypt.genSaltSync(10);

const ownerUsers = (walletDetails, reserveWallet,newWallet) =>
  walletDetails.map(({ _id, type }, index) => {
    const record = { ...users[index], wallet: _id, type };
    return type === "owner" ? { ...record, reserveWallet , newWallet } : record;
  });

var users = {
  0: {
    firstName: "Admin",
    lastName: "Smith",
    type: "owner",
    email: "admin@gmail.com",
    password: bcrypt.hashSync("12345678", salt),
  },
  1: {
    firstName: "Andres Leite",
    lastName: "Casielles",
    type: "ownerSon1",
    email: "andresleitecasielles@gmail.com",
    password: bcrypt.hashSync("12345678", salt),
  },
  2: {
    firstName: "Antonio Leite",
    lastName: "Casielles",
    type: "ownerSon2",
    email: "tonoleite@hotmail.com",
    password: bcrypt.hashSync("12345678", salt),
  },
  3: {
    firstName: "Paulina Leite",
    lastName: "Casielles",
    type: "ownerSon3",
    email: "paulinaleitec@hotmail.com",
    password: bcrypt.hashSync("12345678", salt),
  },
};

export default ownerUsers;
