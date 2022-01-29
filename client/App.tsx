import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Alert, ImageBackground, Image, CameraRollAssetType, TextInput, ActivityIndicator } from 'react-native'
import { Camera } from 'expo-camera'
import base64 from 'base64-js'
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import * as Permissions from 'expo-permissions';
import { FontAwesome5 } from '@expo/vector-icons';
import Expo2DContext from 'expo-2d-context';
import { GLView } from 'expo-gl';
//import { PIXI } from 'expo-pixi';
import * as MediaLibrary from 'expo-media-library';
import { NativeModules } from "react-native";
import {Picker} from "react-native";


const io = require('socket.io-client');

let endpoint = "<End Point Address Goes Here>";

class App extends React.Component {
  camera: Camera;
  webSocket: any;
  loader: any;
  videoTimer = 2;
  state = {
    isAuthenticated: false,
    setStartCamera: false,
    setPreviewVisible: false,
    setCameraType: "back",
    isConnected: false,
    passportNumber: "",
    serverImageReceived: false,
    savingStarted: false,
    serverVideoReceived: false,
    setsessionid: "",
    setpersonid: "",
    countDown: 0,
    startRecording: false,
    setting: 1, // 1: outdoor, //2: indoor, //3: whitepaper
    setsetting: "1",
    secondScreen: false,
    setCapturedVideoLeft: null,
    setCapturedVideoRight: null,
    setCapturedImageLeft: null,
    setCapturedImageRight: null,
  }
  myInterval: any = null;
  // const [startCamera, setStartCamera] = React.useState(false)
  // const [previewVisible, setPreviewVisible] = React.useState(false)
  // const [capturedImage, setCapturedImage] = React.useState<any>(null)
  // const [cameraType, setCameraType] = React.useState(Camera.Constants.Type.back)
  // const [flashMode, setFlashMode] = React.useState('off')

  constructor(props: any) {
    super(props);
  }

  getRGBAarray(arr: any) {
    var i, j, temp: any = [], chunk = 4;
    for (i = 0, j = arr.length; i < j; i += chunk) {
      temp.push(arr.slice(i, i + chunk))
    }
    return temp
  }

  string2Bin(str: string) {
    var result = "";
    for (var i = 0; i < str.length; i++) {
      console.log(str.charCodeAt(i))
      var bits = "0" + (str.charCodeAt(i) >>> 0).toString(2);
      result += bits;
    }
    return result;
  }


  async componentDidMount() {
    var ws = new WebSocket(encodeURI(endpoint + "ws"));
    this.webSocket = ws;

    // try {
    //   const context = await GLView.createContextAsync();
    //   const app = new PIXI.Application({ context });
    //   const sprite = await PIXI.Sprite.fromExpoAsync(require('./assets/favicon.png'));
    //   console.log('sprite', typeof sprite);
    //   app.stage.addChild(sprite);
    //   const pixels = app.renderer.extract.pixels(sprite)
    //   console.log("COLORING")
    //   const binArr = this.string2Bin("Bhavin")
    //   console.log(binArr);
    //   var chunks = this.getRGBAarray(pixels)
    //   //console.log("Color", chunks)
    // } catch (error) {
    //   console.log(error);
    // }

    ws.onopen = () => {
      console.log("Connection Created")
      this.setState({ isConnected: true });
    };

    ws.onmessage = (data) => {
      var reply = JSON.parse(data.data)
      console.log("Message Received:", reply)
      if (reply["type"] == "Picture_Right" && reply["message"] == "Message Received") {
        this.setState({ serverImageReceived: true });
      }
    }

    ws.onerror = e => {
      console.log("Socket Error: ", e.message);
    };

    ws.onclose = () => {
      console.log("Connection Closed")
      this.setState({ isConnected: false });
    }
  }

  __startCamera = async () => {

    fetch(endpoint + "api", {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: "Authenticate", sessionid: this.state.setsessionid, personid: this.state.setpersonid })
    }).then(
      response => response.json() // if the response is a JSON object
    ).then(data => {
      console.log (data)
      if (data["type"] == "Authenticate" && data["status_code"] == 200) {
        this.setState({ isAuthenticated: true })
        this.cameraStart()
      }
      console.log(data)
    });

  }

  cameraStart = async () => {
    const perm = await Permissions.askAsync(Permissions.CAMERA_ROLL);
        if (perm.status != 'granted') {
          console.log("Not granted")
        }
        const { status } = await Camera.requestPermissionsAsync()
        let { permissions } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
        console.log(status)
        if (status === 'granted') {
          this.setState({
            setStartCamera: true
          })
        } else {
          Alert.alert('Access denied')
        }
  }

  recordVideo = async () => {
    const options = {
      mute: true
    }
    this.camera.recordAsync(options).then(data => {
      console.log(this.state.secondScreen);
      if (this.state.secondScreen == false) {
        this.setState({ secondScreen: true })
        this.setState({ setCapturedVideoLeft: data })
      }
      else {
        this.setState({ setCapturedVideoRight: data })
        this.setState({ setPreviewVisible: true })
      }
    }).catch(error => { console.log(error) })

    this.myInterval = setInterval(() => {
      this.setState({ startRecording: true })
      if (this.state.countDown < this.videoTimer) {
        this.setState({ countDown: this.state.countDown + 1 })
      }
      else {
        this.setState({ startRecording: false })
        this.setState({ countDown: 0 })
        this.camera.stopRecording()
        clearInterval(this.myInterval)
      }
    }, 1000)

  }

  __takePicture = async () => {
    this.camera.takePictureAsync().then(photo => {
      if (this.state.secondScreen == false) {
        this.setState({ setCapturedImageLeft: photo })
      }
      else {
        this.setState({ setCapturedImageRight: photo })
      }
      this.recordVideo();
    })
  }

  __savePhoto = async () => {
    this.setState({ savingStarted: true })
    try {
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'images/')
    }
    catch (error) {
      console.log("Directory creation: ", error)
    }
    if (this.state.setCapturedImageLeft != null && this.state.setCapturedImageRight != null) {
      try {
        const base64Image = await FileSystem.readAsStringAsync(this.state.setCapturedImageLeft.uri, { encoding: 'base64' });
        this.webSocket.send(JSON.stringify({ photo: base64Image, type: "Picture_Left", sessionid: this.state.setsessionid, personid: this.state.setpersonid, setting: this.state.setsetting }));
        var byteArray = base64.toByteArray(base64Image)
        console.log("<<<<<<", byteArray.length);

        // try {
        //   var asset = await MediaLibrary.createAssetAsync(this.state.setCapturedImageLeft.uri);
        //   console.log(">>>>>>> ", asset.uri)


        //   const context = await GLView.createContextAsync();
        //   const app = new PIXI.Application({ context });
        //   console.log(FileSystem.documentDirectory + 'images/fingerprint_left.png')
        //   const sprite = await PIXI.Sprite.fromExpoAsync(require('./assets/icon.png'));
        //   console.log('sprite', typeof sprite);
        //   app.stage.addChild(sprite);
        //   const pixels = app.renderer.extract.pixels(sprite)
        //   console.log("COLORING2222")
        //   const binArr = this.string2Bin("TEMP NEW")
        //   console.log(binArr);
        //   var chunks = this.getRGBAarray(pixels)
        //   //console.log("Color", chunks)
        // } catch (error) {
        //   console.log(error);
        // }


        await FileSystem.moveAsync({
          from: this.state.setCapturedImageLeft.uri,
          to: FileSystem.documentDirectory + 'images/fingerprint_left.png'
        })

        console.log("saved Image")
      }
      catch (error) {
        console.log("File save: ", error)
      }

      try {
        const base64 = await FileSystem.readAsStringAsync(this.state.setCapturedImageRight.uri, { encoding: 'base64' });
        console.log("Length: ", base64.length);
        this.webSocket.send(JSON.stringify({ photo: base64, type: "Picture_Right", sessionid: this.state.setsessionid, personid: this.state.setpersonid, setting: this.state.setsetting }));
        await FileSystem.moveAsync({
          from: this.state.setCapturedImageRight.uri,
          to: FileSystem.documentDirectory + 'images/fingerprint_right.png'
        })
        console.log("saved Image")
      }
      catch (error) {
        console.log("File save: ", error)
      }
    }
    this.__saveVideo();
  }

  stringToUint8Array(str: string) {
    const length = str.length
    const array = new Uint8Array(new ArrayBuffer(length))
    for (let i = 0; i < length; i++) array[i] = str.charCodeAt(i)
    console.log("array: ", array)
    return array
  }

  async fileToBase64(uri: string) {
    try {
      const content = await FileSystem.readAsStringAsync(uri)
      return base64.fromByteArray(this.stringToUint8Array(content))
    } catch (e) {
      console.warn('fileToBase64()', e.message)
      return ''
    }
  }

  __saveVideo = async () => {
    try {
      await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'video/')
    }
    catch (error) {
      console.log("Directory creation: ", error)
    }
    console.log(this.state.setCapturedVideoLeft, this.state.setCapturedVideoRight);
    if (this.state.setCapturedVideoLeft != null && this.state.setCapturedVideoRight != null) {
      try {
        console.log("Converting Video to Base64");
        // const base64_send = await this.fileToBase64(this.state.setCapturedVideoLeft.uri)
        const base64_send = await FileSystem.readAsStringAsync(this.state.setCapturedVideoLeft.uri, { encoding: FileSystem.EncodingType.Base64 });

        fetch(endpoint + "api", {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ photo: base64_send, type: "Video_Left", sessionid: this.state.setsessionid, personid: this.state.setpersonid, setting: this.state.setsetting })
        }).then(
          response => response.json() // if the response is a JSON object
        ).then(data => {
          this.setState({ savingStarted: false })// correct this later on
          this.setState({ serverVideoReceived: true })
          if (data["type"] == "Video_Right") {
            this.setState({ serverVideoReceived: true })
          }
          NativeModules.DevSettings.reload();
          console.log(data)
        });


        console.log("Length: ", base64_send.length, base64_send.substring(0, 100));
        // this.webSocket.send(JSON.stringify({photo: base64_send, type: "Video_Left", sessionid: this.state.setsessionid}));
        await FileSystem.moveAsync({
          from: this.state.setCapturedVideoLeft.uri,
          to: FileSystem.documentDirectory + 'video/fingerprint_left.mp4'
        })
        console.log("saved video")
      }
      catch (error) {
        console.log("File save: ", error)
      }

      try {
        console.log("Converting Video to Base64");
        // const base64_send = await this.fileToBase64(this.state.setCapturedVideoRight.uri)
        const base64_send = await FileSystem.readAsStringAsync(this.state.setCapturedVideoRight.uri, { encoding: 'base64' });

        fetch(endpoint + "api", {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ photo: base64_send, type: "Video_Right", sessionid: this.state.setsessionid, personid: this.state.setpersonid, setting: this.state.setsetting })
        }).then(
          response => response.json() // if the response is a JSON object
        ).then(data => console.log(data));


        console.log("Length: ", base64_send.length);
        // this.webSocket.send(JSON.stringify({photo: base64_send, type: "Video_Right", sessionid: this.state.setsessionid}));
        await FileSystem.moveAsync({
          from: this.state.setCapturedVideoRight.uri,
          to: FileSystem.documentDirectory + 'video/fingerprint_right.mp4'
        })
        console.log("saved video")
      }
      catch (error) {
        console.log("File save: ", error)
      }
    }
  }

  __retakePicture = () => {
    this.setState({
      setCapturedImage: null,
      setPreviewVisible: false,
    })
    this.__startCamera()
  }

  __handleFlashMode = () => {
    // if (this.state.setFlashMode === 'on') {
    //   this.setState({
    //     setFlashMode: 'off'
    //   })    
    // } else if (this.state.setFlashMode === 'off') {
    //   this.setState({
    //     setFlashMode: 'on'
    //   })    
    // } else {
    //   this.setState({
    //     setFlashMode: 'off'
    //   })    
    // }
    console.log("Set flash Mode", this.state.setFlashMode)
  }

  __switchCamera = () => {
    if (this.state.setCameraType === 'back') {
      this.setState({
        setCameraType: 'front'
      })
    } else {
      this.setState({
        setCameraType: 'back'
      })
    }
  }

  onChangeText = (text: any) => {
    console.log(text)
  }

  render() {
    return (
      <View style={styles.container}>

        {this.state.setStartCamera ? (
          <View
            style={{
              flex: 1,
              width: '100%',
            }}>
            {this.state.setPreviewVisible && this.state.setCapturedImageLeft && this.state.setCapturedImageRight ? (
              <CameraPreview photoLeft={this.state.setCapturedImageLeft}
                photoRight={this.state.setCapturedImageRight}
                savePhoto={this.__savePhoto}
                retakePicture={this.__retakePicture} />
            ) : (
              this.state.secondScreen ? (<Camera
                type={this.state.setCameraType}
                flashMode={Camera.Constants.FlashMode.on}
                style={{ flex: 1 }}
                focusDepth={1}
                ref={(r) => {
                  this.camera = r
                }}>
                <View
                  style={{
                    flex: 1,
                    width: '100%',
                    backgroundColor: 'transparent',
                    flexDirection: 'row'
                  }}>
                  <View style={{ width: '100%', height: '100%', justifyContent: 'center' }}>
                    <View style={{
                      position: "absolute",
                      top: -100,
                      right: 0,
                      borderTopWidth: 240, borderLeftWidth: 220, borderBottomWidth: 240,
                      borderColor: "black",
                      zIndex: -20,
                      opacity: 0.7,
                      elevation: -20,
                      width: '130%', height: '130%',
                      borderTopLeftRadius: 350,
                      borderBottomLeftRadius: 400
                    }}></View>
                  </View>
                  {this.state.startRecording ? (<View style={{ position: 'absolute', elevation: 100, zIndex: 100, right: 0, padding: 10, backgroundColor: 'black', opacity: 0.7 }}><Text style={{ color: 'white' }}> <FontAwesome5 name="dot-circle" color="#00ff14" /> Recoding Started</Text></View>) : (<View></View>)}
                  {this.state.startRecording ? (
                    <View style={{
                      position: 'absolute',
                      top: '10%',
                      alignSelf: 'center', zIndex: 100,
                      width: '100%', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Text style={{
                        paddingLeft: 20, paddingRight: 20,
                        paddingTop: 10, paddingBottom: 10,
                        backgroundColor: 'black', opacity: 0.7,
                        color: 'white', fontSize: 25,
                        borderRadius: 100
                      }}>{this.state.countDown}</Text>
                    </View>) : (<View></View>)}
                  <View
                    style={{
                      position: 'absolute',
                      left: '5%',
                      top: '10%',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                  </View>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      flexDirection: 'row',
                      flex: 1,
                      width: '100%',
                      padding: 20,
                      justifyContent: 'center',
                      backgroundColor: "transparent",
                      opacity: 0.7,
                      alignItems: 'center',
                    }}
                  >
                    <TouchableOpacity
                      onPress={this.__switchCamera}
                      style={{
                        borderRadius: 1000,
                        height: 50,
                        width: 50,
                        borderColor: '#fff',
                        borderWidth: 2,
                        backgroundColor: this.state.setCameraType === 'back' ? 'transparent' : '#fff',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Text style={{
                        fontSize: 30,
                        color: this.state.setCameraType === 'back' ? '#fff' : '#fff'
                      }}>
                        <MaterialIcons name="switch-camera" size={24} color={this.state.setCameraType === 'back' ? '#fff' : 'black'} />
                      </Text>
                    </TouchableOpacity>
                    <View
                      style={{
                        alignSelf: 'center',
                        flex: 1,
                        alignItems: 'center',
                      }}
                    >
                      <TouchableOpacity
                        onPress={this.__takePicture}
                        style={{
                          width: 70,
                          height: 70,
                          bottom: 0,
                          borderRadius: 50,
                          backgroundColor: '#fff'
                        }}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={this.__handleFlashMode}
                      style={{
                        backgroundColor: this.state.setFlashMode === 'off' ? 'transparent' : '#fff',
                        borderRadius: 1000,
                        height: 50,
                        width: 50,
                        borderColor: '#fff',
                        borderWidth: 2,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                      <Text
                        style={{
                          fontSize: 30
                        }}>
                        <MaterialIcons name="flash-on" size={24} color={this.state.setFlashMode === 'off' ? '#fff' : 'black'} />
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Camera>) : (
                <Camera
                  type={this.state.setCameraType}
                  flashMode={Camera.Constants.FlashMode.on}
                  style={{ flex: 1 }}
                  focusDepth={1}
                  ref={(r) => {
                    this.camera = r
                  }}>
                  <View
                    style={{
                      flex: 1,
                      width: '100%',
                      backgroundColor: 'transparent',
                      flexDirection: 'row'
                    }}>
                    {this.state.startRecording ? (<View style={{ position: 'absolute', elevation: 100, zIndex: 100, right: 0, padding: 10, backgroundColor: 'black', opacity: 0.7 }}><Text style={{ color: 'white' }}> <FontAwesome5 name="dot-circle" color="#00ff14" /> Recoding Started</Text></View>) : (<View></View>)}
                    {this.state.startRecording ? (
                      <View style={{
                        position: 'absolute',
                        top: '10%',
                        alignSelf: 'center', zIndex: 100,
                        width: '100%', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Text style={{
                          paddingLeft: 20, paddingRight: 20,
                          paddingTop: 10, paddingBottom: 10,
                          backgroundColor: 'black', opacity: 0.7,
                          color: 'white', fontSize: 25,
                          borderRadius: 100
                        }}>{this.state.countDown}</Text>
                      </View>) : (<View></View>)}

                    <View style={{ width: '100%', height: '100%', justifyContent: 'center' }}>
                      <View style={{
                        borderTopWidth: 240, borderRightWidth: 220, borderBottomWidth: 240,
                        borderColor: "black",
                        opacity: 0.7,
                        width: '130%', height: '130%',
                        borderTopRightRadius: 350,
                        borderBottomRightRadius: 400
                      }}></View>
                    </View>
                    <View
                      style={{
                        position: 'absolute',
                        left: '5%',
                        top: '10%',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                    </View>
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        flexDirection: 'row',
                        flex: 1,
                        width: '100%',
                        padding: 20,
                        justifyContent: 'center',
                        backgroundColor: "transparent",
                        opacity: 0.7,
                        alignItems: 'center',
                      }}
                    >
                      <TouchableOpacity
                        onPress={this.__switchCamera}
                        style={{
                          borderRadius: 1000,
                          height: 50,
                          width: 50,
                          borderColor: '#fff',
                          borderWidth: 2,
                          backgroundColor: this.state.setCameraType === 'back' ? 'transparent' : '#fff',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Text style={{
                          fontSize: 30,
                          color: this.state.setCameraType === 'back' ? '#fff' : '#fff'
                        }}>
                          <MaterialIcons name="switch-camera" size={24} color={this.state.setCameraType === 'back' ? '#fff' : 'black'} />
                        </Text>
                      </TouchableOpacity>
                      <View
                        style={{
                          alignSelf: 'center',
                          flex: 1,
                          alignItems: 'center',
                        }}
                      >
                        <TouchableOpacity
                          onPress={this.__takePicture}
                          style={{
                            width: 70,
                            height: 70,
                            bottom: 0,
                            borderRadius: 50,
                            backgroundColor: '#fff'
                          }}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={this.__handleFlashMode}
                        style={{
                          backgroundColor: this.state.setFlashMode === 'off' ? 'transparent' : '#fff',
                          borderRadius: 1000,
                          height: 50,
                          width: 50,
                          borderColor: '#fff',
                          borderWidth: 2,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                        <Text
                          style={{
                            fontSize: 30
                          }}>
                          <MaterialIcons name="flash-on" size={24} color={this.state.setFlashMode === 'off' ? '#fff' : 'black'} />
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Camera>
              )
            )}
            {this.state.savingStarted && !this.state.serverVideoReceived ? (<View style={{
              position: 'absolute',
              backgroundColor: 'black',
              opacity: 0.7,
              height: '100%', width: '100%',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <ActivityIndicator size="large" color="#00ff00" />
              <Text>{this.state.serverImageReceived}{this.state.serverVideoReceived}</Text>
            </View>) : (<View></View>)}
            {this.state.serverImageReceived && this.state.serverVideoReceived ? (<View style={{
              position: 'absolute',
              backgroundColor: 'black',
              opacity: 0.7,
              height: '100%', width: '100%',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Ionicons name="md-checkmark-circle" size={100} color="white" />
            </View>) : (<View></View>)}
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              height: '100%',
              backgroundColor: '#fff',
              alignItems: 'center',
              width: '100%',
            }}>
            <View style={{
              width: "100%",
              paddingLeft: '5%',
              paddingRight: '5%',
              paddingTop: '5%',
              paddingBottom: '5%',
              backgroundColor: '#ffffff',
              borderBottomColor: '#d3d3d3',
              borderBottomWidth: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.8,
              shadowRadius: 2,
              elevation: 5
            }}>
              <Text style={{ fontSize: 25 }}>Contactless Fingerprint</Text>
            </View>
            <View style={{ width: "100%", alignItems: "center" }}>

            <Text style={{
                height: 50, width: "80%",
                fontSize: 15, marginTop: "5%",
                paddingTop: 10, marginBottom: "0%", paddingLeft: 15, paddingRight: 15}}>Session ID</Text>

              <TextInput placeholder="Session ID"
                style={{
                  height: 50, width: "80%",
                  fontSize: 18, marginTop: -10,
                  paddingTop: 10, marginBottom: "0%", borderColor: '#bcbcbc',
                  borderWidth: 1, paddingLeft: 15, paddingRight: 15, paddingBottom: 10
                }}
                onChangeText={sessionid => this.setState({ setsessionid: sessionid })} />

              <Text style={{
                height: 50, width: "80%",
                fontSize: 15, marginTop: "5%",
                paddingTop: 10, marginBottom: "0%", paddingLeft: 15, paddingRight: 15}}>Person ID</Text>

              <TextInput placeholder="Person ID" //secureTextEntry={true}
                style={{
                  height: 50, width: "80%",
                  fontSize: 18, marginTop: -10,
                  paddingTop: 10, marginBottom: "0%", borderColor: '#bcbcbc',
                  borderWidth: 1, paddingLeft: 15, paddingRight: 15, paddingBottom: 10
                }}
                onChangeText={personid => this.setState({ setpersonid: personid })} />

             
                <View>

<Text style={{
                height: 50, width: "80%",
                fontSize: 15, marginTop: "5%",
                paddingTop: 10, marginBottom: "0%", paddingLeft: 15, paddingRight: 15}}>Background</Text>

<Picker selectedValue={this.state.setsetting} onValueChange={(itemValue, itemIndex) => this.setState({ setsetting: itemValue })}>
  <Picker.Item label="Indoor" value="1" />
              <Picker.Item label="Outdoor" value="2" />
              <Picker.Item label="White Background" value="3" />
</Picker>

</View>
               
            </View>
            <View style={{
              flex: 1,
              height: '100%',
              backgroundColor: '#fff',
              alignItems: 'center',
              width: '100%'
            }}>
              <TouchableOpacity
                onPress={this.__startCamera}
                style={{
                  width: '80%',
                  borderRadius: 4,
                  backgroundColor: '#14274e',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 40,
                  position: 'absolute',
                  bottom: 0,
                  marginBottom: 20,
                  marginTop: 20
                }}>
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                  Take picture
            </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={{
          width: '100%',
          alignItems: 'center',
          backgroundColor: this.state.isConnected == true ? 'green' : 'red',
        }}>
          <Text style={{
            color: 'white',
            paddingTop: 5,
            paddingBottom: 5,
            fontSize: 15,
          }}>{this.state.isConnected == true ? 'Connected' : 'Disconnected'}</Text>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
})

const CameraPreview = ({ photoLeft, photoRight, retakePicture, savePhoto }: any) => {
  return (
    <View style={{ height: '100%', width: '100%', alignItems: 'center' }}>
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        justifyContent: 'center',
        marginTop: 15
      }}>
        <View
          style={{
            backgroundColor: 'white',
            width: 145,
            borderColor: '#a5a5a5',
            borderWidth: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.8,
            shadowRadius: 2,
            margin: 10,
            padding: 5,
            borderRadius: 5,
            justifyContent: 'center'
          }}>
          <ImageBackground
            source={{ uri: photoLeft && photoLeft.uri }}
            style={{ height: 255 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                padding: 15,
                justifyContent: 'flex-end'
              }}>
            </View>
          </ImageBackground>
          <Text style={{ fontSize: 18, textAlign: 'center', marginTop: 3 }}>Left</Text>
        </View>

        <View
          style={{
            backgroundColor: 'white',
            width: 145,
            borderColor: '#a5a5a5',
            borderWidth: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.8,
            shadowRadius: 2,
            margin: 10,
            padding: 5,
            borderRadius: 5,
            justifyContent: 'center'
          }}>
          <ImageBackground
            source={{ uri: photoRight && photoRight.uri }}
            style={{ height: 255 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'column',
                padding: 15,
                justifyContent: 'flex-end'
              }}>
            </View>
          </ImageBackground>
          <Text style={{ fontSize: 18, textAlign: 'center', marginTop: 3 }}>Right</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={savePhoto}
        style={{
          width: '80%',
          borderRadius: 4,
          backgroundColor: '#14274e',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          height: 40,
          position: 'absolute',
          bottom: 60,
          marginBottom: 20,
          marginTop: 20
        }}>
        <Text
          style={{
            color: '#fff',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
          Save Fingerprint
            </Text>
      </TouchableOpacity>


      <TouchableOpacity
        onPress={retakePicture}
        style={{
          width: '80%',
          borderRadius: 4,
          backgroundColor: '#14274e',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          height: 40,
          position: 'absolute',
          bottom: 0,
          marginBottom: 20,
          marginTop: 20
        }}>
        <Text
          style={{
            color: '#fff',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
          Retake Fingerprint
            </Text>
      </TouchableOpacity>
    </View>
  )
}

export default App;