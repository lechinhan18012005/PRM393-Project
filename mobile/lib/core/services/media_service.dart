import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

class PickedMediaFile {
  final Uint8List bytes;
  final String filename;
  final String? path;

  const PickedMediaFile({
    required this.bytes,
    required this.filename,
    this.path,
  });
}

abstract class MediaService {
  static MediaService instance = _createDefault();

  static MediaService _createDefault() {
    if (!kIsWeb) {
      try {
        if (Platform.environment.containsKey('FLUTTER_TEST')) {
          return MockMediaService();
        }
      } catch (_) {}
    }
    return DeviceMediaService();
  }

  Future<PickedMediaFile?> pickImageFromCamera();
  Future<PickedMediaFile?> pickImageFromGallery();
}

class DeviceMediaService implements MediaService {
  final ImagePicker _picker = ImagePicker();

  @override
  Future<PickedMediaFile?> pickImageFromCamera() async {
    try {
      final xFile = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      if (xFile == null) return null;
      final bytes = await xFile.readAsBytes();
      return PickedMediaFile(
        bytes: bytes,
        filename: xFile.name.isNotEmpty ? xFile.name : 'camera_${DateTime.now().millisecondsSinceEpoch}.jpg',
        path: xFile.path,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Future<PickedMediaFile?> pickImageFromGallery() async {
    try {
      final xFile = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      if (xFile == null) return null;
      final bytes = await xFile.readAsBytes();
      return PickedMediaFile(
        bytes: bytes,
        filename: xFile.name.isNotEmpty ? xFile.name : 'gallery_${DateTime.now().millisecondsSinceEpoch}.jpg',
        path: xFile.path,
      );
    } catch (_) {
      return null;
    }
  }
}

class MockMediaService implements MediaService {
  PickedMediaFile? mockedFile;

  @override
  Future<PickedMediaFile?> pickImageFromCamera() async {
    if (mockedFile != null) return mockedFile;
    // Default valid JPEG bytes for testing
    final sampleBytes = Uint8List.fromList([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
      0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
      0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9,
    ]);
    return PickedMediaFile(
      bytes: sampleBytes,
      filename: 'mock_handover.jpg',
      path: '/tmp/mock_handover.jpg',
    );
  }

  @override
  Future<PickedMediaFile?> pickImageFromGallery() async {
    return pickImageFromCamera();
  }
}
