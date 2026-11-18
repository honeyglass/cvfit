// The PNGs of a showcase PDF, drawn with PDFKit, so the page images follow the Google PDF.
//
// pages <pdf> <prefix>: one image per page, 900 px wide, as <prefix>-1.png, <prefix>-2.png, ...
// excerpt <pdf> <out> [<background> <ink>]: the top of page 1, 1600 x 948 px, for the README;
// with two hex colors, the paper becomes the background and the ink the second color.
//
// PDFKit ships with macOS, so the images need no download; on another system they wait for a Mac.
import AppKit
import PDFKit

let pageWidth = 900
let excerptWidth = 1600
let excerptHeight = 948

func drawn(_ page: PDFPage, width: Int) -> CGImage {
  let box = page.bounds(for: .mediaBox)
  let scale = CGFloat(width) / box.width
  let height = Int((box.height * scale).rounded())
  let context = CGContext(
    data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  context.scaleBy(x: scale, y: scale)
  page.draw(with: .mediaBox, to: context)
  return context.makeImage()!
}

func saved(_ image: CGImage, _ path: String) {
  let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])!
  try! png.write(to: URL(fileURLWithPath: path))
}

func rgb(_ hex: String) -> [Double] {
  let value = Int(hex, radix: 16)!
  return [Double((value >> 16) & 255), Double((value >> 8) & 255), Double(value & 255)]
}

// Each pixel takes the background or the ink by how dark it was, so edges stay smooth.
func recolored(_ image: CGImage, background: [Double], ink: [Double]) -> CGImage {
  let width = image.width
  let height = image.height
  var pixels = [UInt8](repeating: 0, count: width * height * 4)
  let context = CGContext(
    data: &pixels, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  for index in stride(from: 0, to: pixels.count, by: 4) {
    let red = Double(pixels[index])
    let green = Double(pixels[index + 1])
    let blue = Double(pixels[index + 2])
    let darkness = 1 - (0.299 * red + 0.587 * green + 0.114 * blue) / 255
    for channel in 0..<3 {
      let value = background[channel] + (ink[channel] - background[channel]) * darkness
      pixels[index + channel] = UInt8(value.rounded())
    }
    pixels[index + 3] = 255
  }
  return context.makeImage()!
}

let arguments = CommandLine.arguments
let document = PDFDocument(url: URL(fileURLWithPath: arguments[2]))!
switch arguments[1] {
case "pages":
  for index in 0..<document.pageCount {
    saved(drawn(document.page(at: index)!, width: pageWidth), "\(arguments[3])-\(index + 1).png")
  }
case "excerpt":
  let page = drawn(document.page(at: 0)!, width: excerptWidth)
  var image = page.cropping(to: CGRect(x: 0, y: 0, width: excerptWidth, height: excerptHeight))!
  if arguments.count == 6 {
    image = recolored(image, background: rgb(arguments[4]), ink: rgb(arguments[5]))
  }
  saved(image, arguments[3])
default:
  FileHandle.standardError.write("unknown mode \(arguments[1]); use pages or excerpt\n".data(using: .utf8)!)
  exit(1)
}
