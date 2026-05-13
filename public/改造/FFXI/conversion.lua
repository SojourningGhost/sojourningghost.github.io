-- FFXI lib for converting between Shift JIS and UTF-8 for the purpose of allowing UI addons to properly display CJK characters taken from in game
-- dics is a big dictionary of UTF-8/Shift JIS equivalents
-- using this lib requires editing whichever addon displays CJK characters to include it

-- to do
-- fetch autotranslate references
-- simplify toutf (with string comparisons?)
-- investigate certain glyphs like 〇 not displaying　in imgui
    -- not an error, just not available as is; not sure how to fix, but probably not necessary
-- recognize regex during string conversion?
-- find out whence job/body slot references are being taken and JPify then
-- missing 翅、髭、〇

require 'dics';

-- can't deal with mixed utf/jis strings
function toutf(string)   
    if string then
        local utf_string = "";
        local i = 1;
        
        while i <= #string do
            local byte = string.byte(string, i);
            
            if byte == 253 then
                utf_string = utf_string .. "autotranslate";
                local j = 1;
                while string.byte(string, i+j) ~= 253 do                
                    j = j + 1;
                end
                i = i + j;
            elseif (byte >= 129 and byte <= 159) or (byte >= 224 and byte <= 239) then
                -- local next_byte = string.byte(string, i+1);
                sub = string.sub(string, i, i+1);
                
                utf_string = utf_string .. jis_utf_dic[sub];
                
                -- increment the iterator once extra to account for consuming two bytes
                i = i + 1;           
            elseif jis_utf_dic[string.char(byte)] then
                utf_string = utf_string .. jis_utf_dic[string.char(byte)];
            end           
            i = i + 1;
        end
        
        return utf_string;
    else
        return nil;
    end
end

function tojis(string)
    if string then
        local jis_string = "";
        local i = 1;
        
        while i <= #string do
            match = string.match(string, "[%z\1-\127\194-\244][\128-\191]*", i);
            jis_string = jis_string .. utf_jis_dic[match];
            i = i + #match;
        end
        
        return jis_string;
    else
        return nil;
    end
end

function get_esc_chars(string)
    if string then
        local esc_chars = "";
        local i = 1;
        
        for i = 1, #string do
            esc_chars = esc_chars .. "\\" .. tostring(string.byte(string, i));
        end
        
        return esc_chars;
    else
        return nil;
    end
end