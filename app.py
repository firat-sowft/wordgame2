import os
from flask import Flask, request, jsonify, make_response
from pymongo import MongoClient
import smtplib
from email.mime.text import MIMEText
import random
import string
from flask_cors import CORS
import re
from bson import ObjectId

app = Flask(__name__)
CORS(app)

# MongoDB bağlantısı
MONGODB_URI = os.getenv('MONGODB_URI', "mongodb+srv://mhmmdgymn:suskun1200@cluster0.uquyz.mongodb.net/WordGame?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true")
client = MongoClient(MONGODB_URI)
db = client.WordGame
play_collection = db.play
words_collection = db.words

# E-posta ayarları
sender_email = os.getenv('SENDER_EMAIL', "kelimeoyunu.heyecnibastir@gmail.com")
sender_password = os.getenv('SENDER_PASSWORD', "qnon exwe vodo ducp")

verification_codes = {}  # Doğrulama kodlarını geçici olarak saklamak için

def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

def send_verification_email(to_email, code):
    msg = MIMEText(f'Doğrulama kodunuz: {code}')
    msg['Subject'] = 'Kelime Oyunu Doğrulama Kodu'
    msg['From'] = sender_email
    msg['To'] = to_email

    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Email sending error: {e}")
        return False

def json_response(data, status=200):
    response = make_response(jsonify(data), status)
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response

@app.route('/send-verification', methods=['POST'])
def send_verification():
    data = request.json
    email = data.get('email')
    
    if not email:
        return json_response({'error': 'E-posta adresi gerekli'}, 400)

    # E-posta formatı kontrolü
    if not email.endswith('@gmail.com'):
        return json_response({'error': 'Sadece Gmail adresleri kabul edilmektedir'}, 400)

    # E-posta adresi zaten kayıtlı mı kontrol et
    if play_collection.find_one({'email': email}):
        return json_response({'error': 'Bu e-posta adresi zaten kayıtlı'}, 400)

    verification_code = generate_verification_code()
    verification_codes[email] = verification_code  # Kodu geçici olarak sakla
    
    if send_verification_email(email, verification_code):
        return json_response({'success': True}, 200)
    else:
        return json_response({'error': 'E-posta gönderilemedi'}, 500)

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        surname = data.get('surname')
        email = data.get('email')
        password = data.get('password')
        verification_code = data.get('verificationCode')

        # Tüm alanların dolu olduğunu kontrol et
        if not all([name, surname, email, password, verification_code]):
            return json_response({'error': 'Tüm alanlar gerekli'}, 400)

        # İsim ve soyad kontrolü
        if not re.match(r'^[A-Za-zğüşıöçĞÜŞİÖÇ]+$', name) or not re.match(r'^[A-Za-zğüşıöçĞÜŞİÖÇ]+$', surname):
            return json_response({'error': 'İsim ve soyad sadece harflerden oluşmalıdır'}, 400)

        # Doğrulama kodu kontrolü
        stored_code = verification_codes.get(email)
        if not stored_code or stored_code != verification_code:
            return json_response({'error': 'Geçersiz doğrulama kodu'}, 400)

        # Şifre kontrolü
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,16}$', password):
            return json_response({'error': 'Şifre en az 6, en fazla 16 karakter olmalı ve en az bir büyük harf, bir küçük harf ve bir rakam içermelidir'}, 400)

        # Kullanıcıyı kaydet
        play_collection.insert_one({
            'name': name,
            'surname': surname,
            'email': email,
            'password': password  # Gerçek uygulamada şifreyi hashleyerek saklamalısınız
        })

        # Doğrulama kodunu sil
        verification_codes.pop(email, None)

        return json_response({'success': True}, 200)
    except Exception as e:
        print(f"Registration error: {e}")
        return json_response({'error': 'Sunucu hatası'}, 500)

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return json_response({'error': 'E-posta ve şifre gerekli'}, 400)
    
    user = play_collection.find_one({'email': email, 'password': password})
    
    if user:
        return json_response({
            'success': True,
            'name': user['name'],
            'surname': user['surname']
        }, 200)
    else:
        return json_response({'error': 'Geçersiz e-posta veya şifre'}, 401)

@app.route('/check-email', methods=['POST'])
def check_email():
    data = request.json
    email = data.get('email')
    
    if not email:
        return json_response({'error': 'E-posta adresi gerekli'}, 400)

    if not email.endswith('@gmail.com'):
        return json_response({'error': 'Sadece Gmail adresleri kabul edilmektedir'}, 400)

    user = play_collection.find_one({'email': email})
    if not user:
        return json_response({'error': 'Bu e-posta adresi kayıtlı değil'}, 404)

    verification_code = generate_verification_code()
    verification_codes[email] = verification_code
    
    if send_verification_email(email, verification_code):
        return json_response({'success': True}, 200)
    else:
        return json_response({'error': 'E-posta gönderilemedi'}, 500)

@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get('email')
    verification_code = data.get('verificationCode')
    new_password = data.get('newPassword')

    if not all([email, verification_code, new_password]):
        return json_response({'error': 'Tüm alanlar gerekli'}, 400)

    # Doğrulama kodu kontrolü
    stored_code = verification_codes.get(email)
    if not stored_code or stored_code != verification_code:
        return json_response({'error': 'Geçersiz doğrulama kodu'}, 400)

    # Şifre format kontrolü
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,16}$', new_password):
        return json_response({
            'error': 'Şifre en az 6, en fazla 16 karakter olmalı ve en az bir büyük harf, bir küçük harf ve bir rakam içermelidir'
        }, 400)

    # Şifreyi güncelle
    result = play_collection.update_one(
        {'email': email},
        {'$set': {'password': new_password}}
    )

    if result.modified_count > 0:
        verification_codes.pop(email, None)  # Doğrulama kodunu sil
        return json_response({'success': True}, 200)
    else:
        return json_response({'error': 'Şifre güncellenemedi'}, 400)

# Word management endpoints
@app.route('/words', methods=['GET'])
def get_words():
    words = list(words_collection.find())
    # ObjectId'leri string'e çevir
    for word in words:
        word['_id'] = str(word['_id'])
    return json_response(words)

@app.route('/words', methods=['POST'])
def add_word():
    data = request.json
    word = data.get('word')
    hint = data.get('hint')
    length = data.get('length')
    
    if not all([word, hint, length]):
        return json_response({'error': 'Tüm alanlar gerekli'}, 400)
    
    result = words_collection.insert_one({
        'word': word.upper(),
        'hint': hint,
        'length': length
    })
    
    return json_response({'success': True, 'id': str(result.inserted_id)})

@app.route('/words/<word_id>', methods=['PUT'])
def update_word(word_id):
    data = request.json
    word = data.get('word')
    hint = data.get('hint')
    
    if not all([word, hint]):
        return json_response({'error': 'Tüm alanlar gerekli'}, 400)
    
    result = words_collection.update_one(
        {'_id': ObjectId(word_id)},
        {'$set': {'word': word.upper(), 'hint': hint}}
    )
    
    if result.modified_count > 0:
        return json_response({'success': True})
    return json_response({'error': 'Kelime bulunamadı'}, 404)

@app.route('/words/<word_id>', methods['DELETE'])
def delete_word(word_id):
    result = words_collection.delete_one({'_id': ObjectId(word_id)})
    
    if result.deleted_count > 0:
        return json_response({'success': True})
    return json_response({'error': 'Kelime bulunamadı'}, 404)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
