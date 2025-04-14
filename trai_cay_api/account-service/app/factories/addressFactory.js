const Address=require("../models/address")

const AddressFactory = {
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
    
    // Lấy địa chỉ theo account_id
    findByAccountId: async (db, account_id) => {
        const sql = "SELECT * FROM addresses WHERE account_id = ?";
        const [results] = await db.promise().query(sql, [account_id]);
        
        if (results.length === 0) {
            return null;
        }
        
        return AddressFactory.fromDB(results[0]);
    },
    
    // Tạo hoặc cập nhật địa chỉ
    save: async (db, address) => {
        const validation = address.validate();
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Kiểm tra địa chỉ đã tồn tại chưa
        const existingAddress = await AddressFactory.findByAccountId(db, address.account_id);
        
        if (existingAddress) {
            // Cập nhật địa chỉ
            const updateSql = `
                UPDATE addresses 
                SET tinh = ?, quan = ?, phuong = ?, nha = ?, ghichu = ? 
                WHERE account_id = ?
            `;
            await db.promise().query(updateSql, [
                address.tinh,
                address.quan,
                address.phuong,
                address.nha,
                address.ghichu,
                address.account_id
            ]);
            return { action: 'updated' };
        } else {
            // Thêm địa chỉ mới
            const insertSql = `
                INSERT INTO addresses 
                (account_id, tinh, quan, phuong, nha, ghichu) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await db.promise().query(insertSql, [
                address.account_id,
                address.tinh,
                address.quan,
                address.phuong,
                address.nha,
                address.ghichu
            ]);
            return { action: 'created' };
        }
    }
};

module.exports = AddressFactory;