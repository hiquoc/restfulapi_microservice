const Address=require("../models/address")

const AddressFacade = {
    create: (data) => {
        return new Address(data);
    },

    fromDB: (dbData) => {
        return new Address({
            address_id: dbData.address_id,
            account_id: dbData.account_id,
            tinh: dbData.tinh,
            quan: dbData.quan,
            phuong: dbData.phuong,
            nha: dbData.nha,
            ghichu: dbData.ghichu
        });
    },
    
};

module.exports = AddressFacade;