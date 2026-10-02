const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Tạo thư mục tạm nếu chưa có
['uploads', 'output'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const upload = multer({ dest: 'uploads/' });

app.use(express.static(__dirname));
app.use('/output', express.static(path.join(__dirname, 'output')));

// API nhận file .p12, .mobileprovision và mật khẩu từ giao diện
app.post('/api/sign', upload.fields([
    { name: 'p12', maxCount: 1 },
    { name: 'mobileprovision', maxCount: 1 }
]), (req, res) => {
    const password = req.body.password || '';
    const p12File = req.files['p12'] ? req.files['p12'][0] : null;
    const provisionFile = req.files['mobileprovision'] ? req.files['mobileprovision'][0] : null;

    if (!p12File || !provisionFile) {
        return res.status(400).json({ success: false, message: 'Thiếu file chứng chỉ!' });
    }

    const ipaInput = path.join(__dirname, 'esign.ipa');
    if (!fs.existsSync(ipaInput)) {
        return res.status(500).json({ success: false, message: 'Thiếu file eSign.ipa gốc trên server!' });
    }

    const outputFileName = `esign_signed_${Date.now()}.ipa`;
    const ipaOutput = path.join(__dirname, 'output', outputFileName);
    
    // Lệnh gọi zsign để tiến hành ký
    const zsignCmd = `zsign -k "${p12File.path}" -p "${password}" -m "${provisionFile.path}" -o "${ipaOutput}" "${ipaInput}"`;

    exec(zsignCmd, (error, stdout, stderr) => {
        // Xóa file chứng chỉ tạm của user để đảm bảo bảo mật
        fs.unlink(p12File.path, () => {});
        fs.unlink(provisionFile.path, () => {});

        if (error) {
            console.error('Lỗi zsign:', stderr);
            return res.status(500).json({ success: false, message: 'Ký thất bại! Sai mật khẩu p12 hoặc chứng chỉ bị lỗi.' });
        }

        const host = req.get('host');
        const protocol = req.protocol;
        
        res.json({
            success: true,
            installUrl: `${protocol}://${host}/output/${outputFileName}`
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
});
