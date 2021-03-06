// This file makes the assumption that a (Nan::Persistent<Value> *) pointer will
// fit in a (FILE *) pointer

#include <v8.h>
#include <nan.h>

#include "../common.h"
#include "../structures/handles.h"
#include "../structures/oc-payload.h"

extern "C" {
#include <ocstack.h>
#include <ocpayload.h>
}

using namespace v8;
using namespace node;

static Nan::Persistent<Object> *context = 0;
static Nan::Callback *callbackFor_open = 0;
static Nan::Callback *callbackFor_close = 0;
static Nan::Callback *callbackFor_read = 0;
static Nan::Callback *callbackFor_write = 0;
static Nan::Callback *callbackFor_unlink = 0;

// If the JS callback succeeds, create a Nan::Persistent<Value> containing the
// JS file descriptor
static FILE *defaultOpen(const char *path, const char *mode) {
  Nan::Persistent<Value> *fp = 0;
  if (callbackFor_open) {
    Local<Value> arguments[2] = {Nan::New(path).ToLocalChecked(),
                                 Nan::New(mode).ToLocalChecked()};
    Local<Value> returnValue =
        callbackFor_open->Call(Nan::New<Object>(*context), 2, arguments);
    VALIDATE_CALLBACK_RETURN_VALUE_TYPE(returnValue, IsNumber,
                                        "persistent storage open");
    if (returnValue->NumberValue() >= 0) {
      fp = new Nan::Persistent<Value>(returnValue);
    }
  }
  return (FILE *)fp;
}

static size_t defaultRead(void *ptr, size_t size, size_t count, FILE *stream) {
  size_t sizeRead = 0;

  if (callbackFor_read) {
    size_t totalSize = size * count;
    Local<Object> buffer = Nan::NewBuffer(totalSize).ToLocalChecked();
    Local<Value> arguments[3] = {
        buffer, Nan::New((double)totalSize),
        Nan::New<Value>(*(Nan::Persistent<Value> *)stream)};
    Local<Value> returnValue = callbackFor_read->Call(3, arguments);
    VALIDATE_CALLBACK_RETURN_VALUE_TYPE(returnValue, IsUint32,
                                        "persistent storage read");
    sizeRead = returnValue->Uint32Value();

    memcpy(ptr, Buffer::Data(buffer), totalSize);
  }

  return sizeRead;
}

static size_t defaultWrite(const void *ptr, size_t size, size_t count,
                           FILE *stream) {
  size_t sizeWritten = 0;

  if (callbackFor_write) {
    size_t totalSize = size * count;
    Local<Object> buffer =
        Nan::CopyBuffer((const char *)ptr, totalSize).ToLocalChecked();
    Local<Value> arguments[3] = {
        buffer, Nan::New((double)totalSize),
        Nan::New<Value>(*(Nan::Persistent<Value> *)stream)};
    Local<Value> returnValue = callbackFor_write->Call(3, arguments);
    VALIDATE_CALLBACK_RETURN_VALUE_TYPE(returnValue, IsUint32,
                                        "persistent storage write");
    sizeWritten = returnValue->Uint32Value();
  }

  return sizeWritten;
}

static int defaultClose(FILE *stream) {
  int returnValue = -1;
  Nan::Persistent<Value> *fp = (Nan::Persistent<Value> *)stream;

  if (callbackFor_close) {
    Local<Value> arguments[1] = {Nan::New<Value>(*fp)};
    Local<Value> jsReturnValue = callbackFor_close->Call(1, arguments);
    VALIDATE_CALLBACK_RETURN_VALUE_TYPE(jsReturnValue, IsUint32,
                                        "persistent storage close");
    returnValue = jsReturnValue->Uint32Value();
    if (returnValue == 0) {
      delete fp;
    }
  }

  return returnValue;
}

static int defaultUnlink(const char *path) {
  int returnValue = -1;

  if (callbackFor_unlink) {
    Local<Value> arguments[1] = {Nan::New(path).ToLocalChecked()};
    Local<Value> jsReturnValue = callbackFor_unlink->Call(1, arguments);
    VALIDATE_CALLBACK_RETURN_VALUE_TYPE(jsReturnValue, IsUint32,
                                        "persistent storage close");
    returnValue = jsReturnValue->Uint32Value();
  }

  return returnValue;
}

static OCPersistentStorage psCallbacks = {
    defaultOpen, defaultRead, defaultWrite, defaultClose, defaultUnlink};

#define VALIDATE_MEMBER(jsObject, memberName)                                 \
  if (!((Nan::Get(jsCallbacks, Nan::New("open").ToLocalChecked())             \
             .ToLocalChecked())->IsFunction())) {                             \
    return Nan::ThrowTypeError("Persistent storage callback for " #memberName \
                               " must be a function");                        \
  }

#define ASSIGN_CALLBACK(source, name)                           \
  if (callbackFor_##name) {                                     \
    delete callbackFor_##name;                                  \
  }                                                             \
  callbackFor_##name = new Nan::Callback(Local<Function>::Cast( \
      Nan::Get((source), Nan::New(#name).ToLocalChecked()).ToLocalChecked()))

NAN_METHOD(bind_OCRegisterPersistentStorageHandler) {
  VALIDATE_ARGUMENT_COUNT(info, 1);
  VALIDATE_ARGUMENT_TYPE(info, 0, IsObject);

  Local<Object> jsCallbacks = Local<Object>::Cast(info[0]);

  VALIDATE_MEMBER(jsCallbacks, "open");
  VALIDATE_MEMBER(jsCallbacks, "close");
  VALIDATE_MEMBER(jsCallbacks, "read");
  VALIDATE_MEMBER(jsCallbacks, "write");
  VALIDATE_MEMBER(jsCallbacks, "unlink");

  OCStackResult result = OCRegisterPersistentStorageHandler(&psCallbacks);

  if (result == OC_STACK_OK) {
    ASSIGN_CALLBACK(jsCallbacks, open);
    ASSIGN_CALLBACK(jsCallbacks, close);
    ASSIGN_CALLBACK(jsCallbacks, read);
    ASSIGN_CALLBACK(jsCallbacks, write);
    ASSIGN_CALLBACK(jsCallbacks, unlink);
    if (context) {
      delete context;
    }
    context = new Nan::Persistent<Object>(jsCallbacks);
  }

  info.GetReturnValue().Set(Nan::New((int)result));
}
