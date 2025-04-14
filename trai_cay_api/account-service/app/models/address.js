class Address {
    constructor({ account_id, tinh, quan, phuong, nha, ghichu, address_id = null }) {
        this.address_id = address_id;
        this.account_id = account_id;
        this.tinh = tinh;
        this.quan = quan;
        this.phuong = phuong;
        this.nha = nha;
        this.ghichu = ghichu || '';
    }

    validate() {
        const errors = [];
        
        if (!this.tinh) {
            errors.push('Tỉnh/Thành phố không được để trống');
        }
        
        if (!this.quan) {
            errors.push('Quận/Huyện không được để trống');
        }
        
        if (!this.phuong) {
            errors.push('Phường/Xã không được để trống');
        }
        
        if (!this.nha) {
            errors.push('Địa chỉ nhà không được để trống');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
module.exports = Address;