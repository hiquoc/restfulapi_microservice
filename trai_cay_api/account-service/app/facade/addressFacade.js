const Address=require("../models/address")

const AddressFacade = {
    create: (data) => {
        return new Address(data);
    },

};

module.exports = AddressFacade;